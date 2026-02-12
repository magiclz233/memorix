import { createReadStream, createWriteStream, promises as fs } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import os from 'os';
import crypto from 'crypto';
import sharp from 'sharp';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db } from '@/app/lib/drizzle';
import { files, userStorages, users } from '@/app/lib/schema';
import { auth } from '@/auth';
import { generateVideoPoster } from '@/app/lib/video';
import { generateImageThumbnail } from '@/app/lib/image-preview';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { resolveS3Client, s3BodyToReadable, normalizeS3Prefix, isNoSuchKeyError } from '@/app/lib/s3-helper';

export const runtime = 'nodejs';

type Params = {
  params: Promise<{ id: string }>;
};

const isSafePath = (root: string, target: string) =>
  target.startsWith(root + path.sep) || target === root;

const resolveContentType = (filePath: string, fallback?: string | null) => {
  if (fallback) return fallback;
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.webp') return 'image/webp';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.gif') return 'image/gif';
  return 'application/octet-stream';
};

let placeholderWebpBytes: Uint8Array | null = null;

const getPlaceholderWebp = async () => {
  if (placeholderWebpBytes) return placeholderWebpBytes;
  const buffer = await sharp({
    create: {
      width: 1,
      height: 1,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .webp({ quality: 60 })
    .toBuffer();
  placeholderWebpBytes = new Uint8Array(buffer);
  return placeholderWebpBytes;
};

const respondPlaceholderWebp = async () => {
  const bytes = await getPlaceholderWebp();
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Length': bytes.byteLength.toString(),
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};

const buildS3ThumbKey = (prefix: string, id: number) =>
  `${prefix ? `${prefix}.memorix/thumbs/` : '.memorix/thumbs/'}${id}.webp`;

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const fileId = Number(id);

  if (!Number.isFinite(fileId)) {
    return new NextResponse('Invalid ID', { status: 400 });
  }

  const result = await db
    .select({
      id: files.id,
      path: files.path,
      mimeType: files.mimeType,
      mediaType: files.mediaType,
      isPublished: files.isPublished,
      userId: userStorages.userId,
      storageType: userStorages.type,
      config: userStorages.config,
    })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .where(eq(files.id, fileId));

  const item = result[0];
  if (!item) {
    return new NextResponse('Not Found', { status: 404 });
  }

  if (!item.isPublished) {
    const session = await auth.api.getSession({ headers: await headers() });
    const email = session?.user?.email;
    if (!email) {
      return new NextResponse('Unauthorized', { status: 403 });
    }
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user || user.id !== item.userId) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  if (item.storageType === 's3') {
    const config = (item.config ?? {}) as {
      endpoint?: string | null;
      region?: string | null;
      bucket?: string | null;
      accessKey?: string | null;
      secretKey?: string | null;
      prefix?: string | null;
    };
    if (!config.bucket || !config.accessKey || !config.secretKey) {
      return new NextResponse('Storage Config Incomplete', { status: 500 });
    }

    const client = resolveS3Client(config);
    const prefix = normalizeS3Prefix(config.prefix);
    const thumbKey = buildS3ThumbKey(prefix, item.id);

    try {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: thumbKey,
        }),
      );
      const body = s3BodyToReadable(response.Body);
      if (body) {
        const headers = new Headers({
          'Content-Type': response.ContentType ?? 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable',
        });
        if (typeof response.ContentLength === 'number') {
          headers.set('Content-Length', response.ContentLength.toString());
        }
        return new NextResponse(Readable.toWeb(body) as BodyInit, {
          status: 200,
          headers,
        });
      }
    } catch (error) {
      console.warn('S3 thumb miss, generating:', error);
    }

    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'memorix-s3-thumb-'));
    const originalTemp = path.join(
      tempRoot,
      `${crypto.randomUUID()}${path.extname(item.path)}`,
    );
    const thumbTemp = path.join(tempRoot, `${item.id}.webp`);
    try {
      const originalResponse = await client.send(
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: item.path,
        }),
      );
      const originalBody = s3BodyToReadable(originalResponse.Body);
      if (!originalBody) {
        return new NextResponse('File Not Found', { status: 404 });
      }
      await pipeline(originalBody, createWriteStream(originalTemp));

      if (item.mediaType === 'video') {
        const poster = await generateVideoPoster(originalTemp, thumbTemp, null);
        if (poster) {
          await client.send(
            new PutObjectCommand({
              Bucket: config.bucket,
              Key: thumbKey,
              Body: createReadStream(thumbTemp),
              ContentType: 'image/webp',
            }),
          );
        } else {
          return new NextResponse('Thumbnail Not Found', { status: 404 });
        }
      } else {
        const thumb = await generateImageThumbnail(originalTemp, thumbTemp);
        if (thumb) {
          await client.send(
            new PutObjectCommand({
              Bucket: config.bucket,
              Key: thumbKey,
              Body: createReadStream(thumbTemp),
              ContentType: 'image/webp',
            }),
          );
        } else {
          const ext = path.extname(originalTemp).toLowerCase();
          if (ext === '.heic' || ext === '.heif') {
            return respondPlaceholderWebp();
          }
          const originalResponse = await client.send(
            new GetObjectCommand({
              Bucket: config.bucket,
              Key: item.path,
            }),
          );
          const originalStream = s3BodyToReadable(originalResponse.Body);
          if (!originalStream) {
            return new NextResponse('File Not Found', { status: 404 });
          }
          const headers = new Headers({
            'Content-Type': resolveContentType(item.path, item.mimeType),
            'Cache-Control': 'public, max-age=31536000, immutable',
          });
          if (typeof originalResponse.ContentLength === 'number') {
            headers.set('Content-Length', originalResponse.ContentLength.toString());
          }
          return new NextResponse(Readable.toWeb(originalStream) as BodyInit, {
            status: 200,
            headers,
          });
        }
      }

      const buffer = await fs.readFile(thumbTemp);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Length': buffer.length.toString(),
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (error) {
      console.error('S3 thumb read failed:', error);
      return new NextResponse('File Not Found', { status: 404 });
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  }

  const rootPath = (item.config as { rootPath?: string })?.rootPath;
  if (!rootPath) {
    return new NextResponse('Storage Root Not Configured', { status: 500 });
  }

  const normalizedRoot = path.resolve(rootPath);
  const thumbPath = path.resolve(
    normalizedRoot,
    '.memorix',
    'thumbs',
    `${item.id}.webp`,
  );
  const originalPath = path.resolve(normalizedRoot, item.path);

  if (!isSafePath(normalizedRoot, thumbPath) || !isSafePath(normalizedRoot, originalPath)) {
    return new NextResponse('Forbidden Path', { status: 403 });
  }

  let targetPath = thumbPath;
  try {
    await fs.stat(thumbPath);
  } catch {
    if (item.mediaType === 'video') {
      const poster = await generateVideoPoster(originalPath, thumbPath, null);
      if (!poster) {
        return new NextResponse('Thumbnail Not Found', { status: 404 });
      }
      targetPath = thumbPath;
      try {
        await fs.stat(thumbPath);
      } catch (error) {
        console.error('Video poster write failed:', error);
        return new NextResponse('Thumbnail Not Found', { status: 404 });
      }
    } else {
      const thumb = await generateImageThumbnail(originalPath, thumbPath);
      if (thumb) {
        targetPath = thumbPath;
      } else {
        const ext = path.extname(originalPath).toLowerCase();
        if (ext === '.heic' || ext === '.heif') {
          return respondPlaceholderWebp();
        }
        targetPath = originalPath;
      }
    }
  }

  try {
    const stat = await fs.stat(targetPath);
    const stream = createReadStream(targetPath);
    return new NextResponse(Readable.toWeb(stream) as BodyInit, {
      status: 200,
      headers: {
        'Content-Length': stat.size.toString(),
        'Content-Type': resolveContentType(
          targetPath,
          targetPath === originalPath ? item.mimeType : 'image/webp',
        ),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Thumb read failed:', error);
    return new NextResponse('File Not Found', { status: 404 });
  }
}
