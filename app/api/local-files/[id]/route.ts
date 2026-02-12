import { createReadStream, promises as fs } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db } from '@/app/lib/drizzle';
import { files, userStorages, users } from '@/app/lib/schema';
import { auth } from '@/auth';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { resolveS3Client, s3BodyToReadable } from '@/app/lib/s3-helper';

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
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.mov') return 'video/quicktime';
  return 'application/octet-stream';
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

  if (item.mediaType === 'video') {
    return new NextResponse('Use media stream for videos', { status: 400 });
  }

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
    try {
      const client = resolveS3Client(config);
      const response = await client.send(
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: item.path,
        }),
      );
      const body = s3BodyToReadable(response.Body);
      if (!body) {
        return new NextResponse('File Not Found', { status: 404 });
      }
      const contentType = resolveContentType(
        item.path,
        item.mimeType ?? response.ContentType,
      );
      const headers = new Headers({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      });
      if (typeof response.ContentLength === 'number') {
        headers.set('Content-Length', response.ContentLength.toString());
      }
      return new NextResponse(Readable.toWeb(body) as BodyInit, {
        status: 200,
        headers,
      });
    } catch (error) {
      console.error('S3 file read failed:', error);
      return new NextResponse('File Not Found', { status: 404 });
    }
  }

  const rootPath = (item.config as { rootPath?: string })?.rootPath;
  if (!rootPath) {
    return new NextResponse('Storage Root Not Configured', { status: 500 });
  }

  const normalizedRoot = path.resolve(rootPath);
  const targetPath = path.resolve(normalizedRoot, item.path);

  if (!isSafePath(normalizedRoot, targetPath)) {
    return new NextResponse('Forbidden Path', { status: 403 });
  }

  try {
    const stat = await fs.stat(targetPath);
    const stream = createReadStream(targetPath);
    return new NextResponse(Readable.toWeb(stream) as BodyInit, {
      status: 200,
      headers: {
        'Content-Length': stat.size.toString(),
        'Content-Type': resolveContentType(targetPath, item.mimeType),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Local file read failed:', error);
    return new NextResponse('File Not Found', { status: 404 });
  }
}
