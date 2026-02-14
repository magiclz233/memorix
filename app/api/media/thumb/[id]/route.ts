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
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { resolveS3Client, s3BodyToReadable } from '@/app/lib/s3-helper';
import { getStorageCacheRoot } from '@/app/lib/storage';

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
      storageId: userStorages.id,
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

  const thumbRoot = getStorageCacheRoot(item.storageId);
  await fs.mkdir(thumbRoot, { recursive: true });
  const thumbPath = path.resolve(thumbRoot, `${item.id}.webp`);
  if (!isSafePath(thumbRoot, thumbPath)) {
    return new NextResponse('Forbidden Path', { status: 403 });
  }

  const respondThumb = async () => {
    const stat = await fs.stat(thumbPath);
    const stream = createReadStream(thumbPath);
    const response = new NextResponse(Readable.toWeb(stream) as BodyInit, {
      status: 200,
      headers: {
        'Content-Length': stat.size.toString(),
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
    try {
      const now = new Date();
      await fs.utimes(thumbPath, now, now);
    } catch {}
    return response;
  };

  try {
    await fs.stat(thumbPath);
    return await respondThumb();
  } catch {}

  if (item.storageType === 's3') {
    const config = (item.config ?? {}) as {
      endpoint?: string | null;
      region?: string | null;
      bucket?: string | null;
      accessKey?: string | null;
      secretKey?: string | null;
    };
    if (!config.bucket || !config.accessKey || !config.secretKey) {
      return new NextResponse('Storage Config Incomplete', { status: 500 });
    }

    const client = resolveS3Client(config);
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'memorix-s3-thumb-'));
    const originalTemp = path.join(
      tempRoot,
      `${crypto.randomUUID()}${path.extname(item.path)}`,
    );
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
        const poster = await generateVideoPoster(originalTemp, thumbPath, null);
        if (!poster) {
          return new NextResponse('Thumbnail Not Found', { status: 404 });
        }
      } else {
        const thumb = await generateImageThumbnail(originalTemp, thumbPath);
        if (!thumb) {
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

      return await respondThumb();
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
  const originalPath = path.resolve(normalizedRoot, item.path);

  if (!isSafePath(normalizedRoot, originalPath)) {
    return new NextResponse('Forbidden Path', { status: 403 });
  }

  if (item.mediaType === 'video') {
    const poster = await generateVideoPoster(originalPath, thumbPath, null);
    if (!poster) {
      return new NextResponse('Thumbnail Not Found', { status: 404 });
    }
    return await respondThumb();
  }

  const thumb = await generateImageThumbnail(originalPath, thumbPath);
  if (thumb) {
    return await respondThumb();
  }

  const ext = path.extname(originalPath).toLowerCase();
  if (ext === '.heic' || ext === '.heif') {
    return respondPlaceholderWebp();
  }

  try {
    const stat = await fs.stat(originalPath);
    const stream = createReadStream(originalPath);
    return new NextResponse(Readable.toWeb(stream) as BodyInit, {
      status: 200,
      headers: {
        'Content-Length': stat.size.toString(),
        'Content-Type': resolveContentType(originalPath, item.mimeType),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Thumb read failed:', error);
    return new NextResponse('File Not Found', { status: 404 });
  }
}
