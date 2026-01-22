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

export const runtime = 'nodejs';

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
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
    const stream = createReadStream(resolvedPath);
    return new NextResponse(Readable.toWeb(stream) as BodyInit, {
      headers: {
        'Content-Type': item.mimeType ?? 'application/octet-stream',
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
