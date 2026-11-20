import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import { promises as fs } from 'fs';

/**
 * 内容级去重的哈希工具（P2-3）。
 * SHA-256 hex（64 字符），与分片上传链路（hash-worker / upload/complete）一致。
 * 流式读取：大文件内存恒定。
 */

const HASH_STREAM_CHUNK = 4 * 1024 * 1024; // 4 MiB

/** 对磁盘文件流式计算 SHA-256（hex）。 */
export async function streamFileSha256(absolutePath: string): Promise<string | null> {
  try {
    await fs.access(absolutePath);
  } catch {
    return null;
  }

  return new Promise((resolve) => {
    const hash = createHash('sha256');
    const stream = createReadStream(absolutePath, {
      highWaterMark: HASH_STREAM_CHUNK,
    });

    stream.on('data', (chunk) => {
      hash.update(chunk);
    });
    stream.on('error', () => resolve(null));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/** 对内存 Buffer 计算 SHA-256（hex）。用于简单上传（文件已在内存）。 */
export function bufferSha256(buffer: Uint8Array): string {
  return createHash('sha256').update(buffer).digest('hex');
}
