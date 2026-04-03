import { promises as fs } from 'fs';
import path from 'path';

const normalizeForComparison = (value: string) =>
  process.platform === 'win32' ? value.toLowerCase() : value;

function isPathInsideRoot(rootPath: string, targetPath: string) {
  const normalizedRoot = normalizeForComparison(path.resolve(rootPath));
  const normalizedTarget = normalizeForComparison(path.resolve(targetPath));
  return (
    normalizedTarget === normalizedRoot ||
    normalizedTarget.startsWith(`${normalizedRoot}${path.sep}`)
  );
}

export interface StorageAdapter {
  read(filePath: string): Promise<Buffer>;
  write(filePath: string, data: Buffer): Promise<void>;
  delete(filePath: string): Promise<void>;
  exists(filePath: string): Promise<boolean>;
  list(prefix: string): AsyncIterable<string>;
  getUrl(filePath: string): string;
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor(
    private rootPath: string,
    private storageId: number,
  ) {}

  private resolvePath(filePath: string): string {
    const resolved = path.resolve(this.rootPath, filePath);
    const normalizedRoot = path.resolve(this.rootPath);

    // Security check: ensure path is within root
    if (!isPathInsideRoot(normalizedRoot, resolved)) {
      throw new Error('Path traversal detected');
    }

    return resolved;
  }

  async read(filePath: string): Promise<Buffer> {
    const absolutePath = this.resolvePath(filePath);
    return fs.readFile(absolutePath);
  }

  async write(filePath: string, data: Buffer): Promise<void> {
    const absolutePath = this.resolvePath(filePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, data);
  }

  async delete(filePath: string): Promise<void> {
    const absolutePath = this.resolvePath(filePath);
    await fs.unlink(absolutePath);
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const absolutePath = this.resolvePath(filePath);
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  async *list(prefix: string): AsyncIterable<string> {
    const absolutePrefix = this.resolvePath(prefix);
    const normalizedRoot = path.resolve(this.rootPath);

    async function* walk(dir: string): AsyncIterable<string> {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const normalizedPath = path.resolve(fullPath);

        // Security check
        if (!isPathInsideRoot(normalizedRoot, normalizedPath)) {
          continue;
        }

        if (entry.isDirectory()) {
          yield* walk(fullPath);
        } else if (entry.isFile()) {
          yield path.relative(normalizedRoot, fullPath);
        }
      }
    }

    yield* walk(absolutePrefix);
  }

  getUrl(filePath: string): string {
    return `/api/storage/local/${this.storageId}/${filePath}`;
  }
}

export class S3StorageAdapter implements StorageAdapter {
  private s3Client: any;
  private bucket: string;
  private region: string;
  private endpoint?: string;
  private publicUrl?: string;

  constructor(config: {
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    region: string;
    endpoint?: string;
    publicUrl?: string;
  }) {
    // Lazy load S3 client to avoid importing in environments where it's not needed
    this.bucket = config.bucket;
    this.region = config.region;
    this.endpoint = config.endpoint;
    this.publicUrl = config.publicUrl;
  }

  private async getS3Client() {
    if (!this.s3Client) {
      const { S3Client } = await import('@aws-sdk/client-s3');
      this.s3Client = new S3Client({
        region: this.region,
        endpoint: this.endpoint,
      });
    }
    return this.s3Client;
  }

  async read(filePath: string): Promise<Buffer> {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await this.getS3Client();

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: filePath,
    });

    const response = await client.send(command);
    const chunks: Uint8Array[] = [];

    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  async write(filePath: string, data: Buffer): Promise<void> {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await this.getS3Client();

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: filePath,
      Body: data,
    });

    await client.send(command);
  }

  async delete(filePath: string): Promise<void> {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await this.getS3Client();

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: filePath,
    });

    await client.send(command);
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
      const client = await this.getS3Client();

      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: filePath,
      });

      await client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  async *list(prefix: string): AsyncIterable<string> {
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const client = await this.getS3Client();

    let continuationToken: string | undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });

      const response = await client.send(command);

      if (response.Contents) {
        for (const object of response.Contents) {
          if (object.Key) {
            yield object.Key;
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);
  }

  getUrl(filePath: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl}/${filePath}`;
    }
    if (this.endpoint) {
      return `${this.endpoint}/${this.bucket}/${filePath}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${filePath}`;
  }
}

export type StorageConfig = {
  type: 'local' | 'nas' | 's3' | 'qiniu';
  config: Record<string, unknown>;
};

export function createStorageAdapter(
  storageType: string,
  config: Record<string, unknown>,
  storageId: number,
): StorageAdapter {
  switch (storageType) {
    case 'local':
    case 'nas':
      return new LocalStorageAdapter(config.rootPath as string, storageId);

    case 's3':
    case 'qiniu':
      return new S3StorageAdapter({
        accessKeyId: config.accessKeyId as string,
        secretAccessKey: config.secretAccessKey as string,
        bucket: config.bucket as string,
        region: (config.region as string) || 'us-east-1',
        endpoint: config.endpoint as string | undefined,
        publicUrl: config.publicUrl as string | undefined,
      });

    default:
      throw new Error(`Unsupported storage type: ${storageType}`);
  }
}
