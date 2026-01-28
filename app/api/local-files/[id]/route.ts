import path from 'path';
import { createReadStream, promises as fs } from 'fs';
import { Readable } from 'stream';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { db } from '@/app/lib/drizzle';
import { files, userStorages, users } from '@/app/lib/schema';
import { eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import sharp from 'sharp';
import { createHash } from 'crypto';

export const runtime = 'nodejs';

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: Params) {
  const t = await getTranslations('api.errors');
  const { id } = await params;
  const fileId = Number(id);
  if (!Number.isFinite(fileId)) {
    return NextResponse.json({ message: t('paramError') }, { status: 400 });
  }

  const result = await db
    .select({
      id: files.id,
      path: files.path,
      mimeType: files.mimeType,
      isPublished: files.isPublished,
      config: userStorages.config,
      userId: userStorages.userId,
    })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .where(eq(files.id, fileId));

  const item = result[0];
  if (!item || !item.path) {
    return NextResponse.json({ message: t('fileNotFound') }, { status: 404 });
  }

  if (!item.isPublished) {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ message: t('fileNotPublished') }, { status: 403 });
    }
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (!user || user.id !== item.userId) {
      return NextResponse.json({ message: t('fileNotPublished') }, { status: 403 });
    }
  }

  const rootPath = (item.config as { rootPath?: string })?.rootPath;
  if (!rootPath) {
    return NextResponse.json({ message: t('rootNotConfigured') }, { status: 400 });
  }

  const normalizedRoot = path.resolve(rootPath);
  const resolvedPath = path.resolve(normalizedRoot, item.path);
  if (
    !resolvedPath.startsWith(normalizedRoot + path.sep) &&
    resolvedPath !== normalizedRoot
  ) {
    return NextResponse.json({ message: t('pathInvalid') }, { status: 403 });
  }

  try {
    await fs.stat(resolvedPath);

    const mimeType = item.mimeType ?? 'application/octet-stream';
    const ext = path.extname(resolvedPath).toLowerCase();
    const isHeic =
      mimeType === 'image/heic' ||
      mimeType === 'image/heif' ||
      ext === '.heic' ||
      ext === '.heif';
    const raw = new URL(request.url).searchParams.get('raw') === '1';

    if (isHeic && !raw) {
      const source = await fs.stat(resolvedPath);
      const cacheKey = createHash('sha1')
        .update(`${resolvedPath}:${source.size}:${source.mtimeMs}`)
        .digest('hex');
      const cacheDir = path.resolve(process.cwd(), '.cache', 'heic');
      const cachePath = path.join(cacheDir, `${cacheKey}.jpg`);

      try {
        const cached = await fs.stat(cachePath);
        if (cached.size > 0) {
          const cachedStream = createReadStream(cachePath);
          return new NextResponse(Readable.toWeb(cachedStream) as BodyInit, {
            headers: {
              'Content-Type': 'image/jpeg',
              'Cache-Control': 'public, max-age=300',
            },
          });
        }
      } catch {
        // Cache miss: continue to transcode.
      }

      const buffer = await fs.readFile(resolvedPath);
      let jpeg: Buffer | null = null;

      try {
        jpeg = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
      } catch (sharpError) {
        try {
          // @ts-expect-error heic-convert might lack type definitions
          const { default: heicConvert } = await import('heic-convert');
          jpeg = (await heicConvert({
            buffer,
            format: 'JPEG',
            quality: 0.9,
          })) as Buffer;
        } catch (fallbackError) {
          console.error('HEIC 转码失败', sharpError, fallbackError);
        }
      }

      if (!jpeg) {
        return NextResponse.json({ message: t('readFailed') }, { status: 500 });
      }

      await fs.mkdir(cacheDir, { recursive: true });
      await fs.writeFile(cachePath, jpeg);
      return new NextResponse(jpeg as any, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    const stream = createReadStream(resolvedPath);
    return new NextResponse(Readable.toWeb(stream) as any, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ message: t('fileNotFound') }, { status: 404 });
    }
    console.error('读取本地文件失败：', error);
    return NextResponse.json({ message: t('readFailed') }, { status: 500 });
  }
}

