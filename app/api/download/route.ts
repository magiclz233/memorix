import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { db } from '@/app/lib/drizzle';
import { files, userStorages } from '@/app/lib/schema';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { canAccessPrivateMedia } from '@/app/lib/share-access';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import { ReadableStream as NodeReadableStream } from 'stream/web';
import { pipeline } from 'stream/promises';
import os from 'os';
import { createZipStream, type FileToZip } from '@/app/lib/zip-generator';
import { mediaCacheHeaders } from '@/app/lib/media-cache';
import { resolveSafeLocalPath } from '@/app/lib/path-safety';
import { resolveS3Client, s3BodyToReadable } from '@/app/lib/s3-helper';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getTranslations } from 'next-intl/server';

export const runtime = 'nodejs';

type StorageConfig = {
  rootPath?: string | null;
  endpoint?: string | null;
  region?: string | null;
  bucket?: string | null;
  accessKey?: string | null;
  secretKey?: string | null;
};

type ResolvedFile = {
  id: number;
  title: string | null;
  path: string;
  mimeType: string | null;
  storageType: string;
  storageConfig: StorageConfig;
  isPublished?: boolean;
  userId?: number;
};

const fileNameFor = (record: ResolvedFile): string => {
  const ext = path.extname(record.path);
  return record.title ? `${record.title}${ext}` : path.basename(record.path);
};

/**
 * 查询当前用户拥有的文件，避免越权下载他人存储源中的内容。
 */
async function resolveFiles(fileIds: number[], userId: number): Promise<ResolvedFile[]> {
  return db
    .select({
      id: files.id,
      title: files.title,
      path: files.path,
      mimeType: files.mimeType,
      storageType: userStorages.type,
      storageConfig: userStorages.config,
      isPublished: files.isPublished,
    })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .where(and(inArray(files.id, fileIds), eq(userStorages.userId, userId), isNull(files.deletedAt), isNull(userStorages.deletedAt))) as Promise<ResolvedFile[]>;
}

/**
 * GET /api/download?id=123 — 前台单文件下载（含照片、视频、实况图）。
 * 走 /api/download 而不是 stream 路由，后者对非视频返回 404。
 */
export async function GET(request: NextRequest) {
  const rawId = request.nextUrl.searchParams.get('id');
  const id = Number(rawId);
  // Number(null)===0、Number('')===0，必须显式拦截，否则会变成 id=0 查库返回 404。
  if (rawId === null || rawId.trim() === '' || !Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  // 公开媒体允许游客下载；私有媒体必须登录且是 owner。
  const [record] = await db
    .select({
      id: files.id,
      title: files.title,
      path: files.path,
      mimeType: files.mimeType,
      storageType: userStorages.type,
      storageConfig: userStorages.config,
      isPublished: files.isPublished,
      userId: userStorages.userId,
    })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .where(and(eq(files.id, id), isNull(files.deletedAt)));

  if (!record) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!record.isPublished) {
    const allowed = await canAccessPrivateMedia({
      fileId: record.id,
      ownerUserId: record.userId!,
      shareToken: request.nextUrl.searchParams.get('share'),
      cookieHeader: request.headers.get('cookie'),
    });
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const recordTyped = { ...record, storageConfig: (record.storageConfig ?? {}) as StorageConfig };
  const fileName = fileNameFor(recordTyped);
  const disposition = `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`;

  if (recordTyped.storageType === 's3' || recordTyped.storageType === 'qiniu') {
    const config = recordTyped.storageConfig ?? {};
    if (!config.bucket || !config.accessKey || !config.secretKey) {
      return NextResponse.json({ error: 'Storage Config Incomplete' }, { status: 500 });
    }
    try {
      const client = resolveS3Client(config);
      const object = await client.send(
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: record.path,
        }),
      );
      const body = s3BodyToReadable(object.Body);
      if (!body) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return new NextResponse(Readable.toWeb(body) as BodyInit, {
        headers: mediaCacheHeaders(record.isPublished !== false, {
          'Content-Type': record.mimeType || 'application/octet-stream',
          'Content-Disposition': disposition,
        }),
      });
    } catch (error) {
      console.error('Download API S3 error:', error);
      return NextResponse.json({ error: 'Download failed' }, { status: 500 });
    }
  }

  const rootPath = recordTyped.storageConfig?.rootPath;
  if (!rootPath) {
    return NextResponse.json({ error: 'Storage Root Not Configured' }, { status: 500 });
  }
  const absolutePath = resolveSafeLocalPath(rootPath, recordTyped.path);
  if (!absolutePath || !fs.existsSync(absolutePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const stat = fs.statSync(absolutePath);
  const stream = fs.createReadStream(absolutePath);
  return new NextResponse(Readable.toWeb(stream) as BodyInit, {
    headers: mediaCacheHeaders(record.isPublished !== false, {
      'Content-Type': record.mimeType || 'application/octet-stream',
      'Content-Disposition': disposition,
      'Content-Length': stat.size.toString(),
    }),
  });
}

/**
 * POST /api/download — 后台批量下载（单文件直出，多文件 ZIP）。
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const t = await getTranslations('api.download');
    const body = await request.json();
    const rawFileIds = body?.fileIds;

    if (!Array.isArray(rawFileIds) || rawFileIds.length === 0) {
      return NextResponse.json({ error: t('missingParameters') }, { status: 400 });
    }

    const fileIds = Array.from(new Set(rawFileIds));
    if (!fileIds.every((id) => Number.isInteger(id) && id > 0)) {
      return NextResponse.json({ error: t('missingParameters') }, { status: 400 });
    }

    const fileRecords = await resolveFiles(fileIds, userId);
    if (fileRecords.length === 0) {
      return NextResponse.json({ error: t('noFiles') }, { status: 404 });
    }

    const filesToDownload: FileToZip[] = [];
    const tempDirs: string[] = [];

    for (const record of fileRecords) {
      if (record.storageType === 'local' || record.storageType === 'nas') {
        const rootPath = record.storageConfig?.rootPath;
        if (!rootPath) continue;
        const absolutePath = resolveSafeLocalPath(rootPath, record.path);
        if (!absolutePath || !fs.existsSync(absolutePath)) continue;
        filesToDownload.push({
          absolutePath,
          fileName: fileNameFor(record),
          mimeType: record.mimeType,
          isPublished: record.isPublished,
        });
        continue;
      }

      if (record.storageType === 's3' || record.storageType === 'qiniu') {
        const config = record.storageConfig ?? {};
        if (!config.bucket || !config.accessKey || !config.secretKey) continue;
        try {
          const client = resolveS3Client(config);
          const object = await client.send(
            new GetObjectCommand({
              Bucket: config.bucket,
              Key: record.path,
            }),
          );
          const body = s3BodyToReadable(object.Body);
          if (!body) continue;
          const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'memorix-download-'));
          tempDirs.push(tempDir);
          const localPath = path.join(tempDir, path.basename(record.path) || 'file');
          await pipeline(body, fs.createWriteStream(localPath));
          filesToDownload.push({
            absolutePath: localPath,
            fileName: fileNameFor(record),
            mimeType: record.mimeType,
            isPublished: record.isPublished,
          });
        } catch (error) {
          console.error('Download API S3 fetch failed:', error);
        }
      }
    }

    if (filesToDownload.length === 0) {
      for (const dir of tempDirs) {
        await fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});
      }
      return NextResponse.json({ error: t('noAccessibleFiles') }, { status: 404 });
    }

    if (filesToDownload.length === 1) {
      const file = filesToDownload[0];
      const stat = fs.statSync(file.absolutePath);
      const stream = fs.createReadStream(file.absolutePath);
      // 批量下载端点全程要求登录，按 owner 过滤，产物对用户私有：一律 no-store。
      return new NextResponse(withCleanup(Readable.toWeb(stream), tempDirs) as BodyInit, {
        headers: mediaCacheHeaders(file.isPublished === true, {
          'Content-Type': file.mimeType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
          'Content-Length': stat.size.toString(),
        }),
      });
    }

    const zipStream = createZipStream(filesToDownload);
    const zipFileName = `download_${Date.now()}.zip`;
    return new NextResponse(withCleanup(Readable.toWeb(zipStream as Readable), tempDirs) as BodyInit, {
      headers: mediaCacheHeaders(false, {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFileName}"`,
      }),
    });
  } catch (error) {
    console.error('Download API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 包装响应流，在流结束或客户端中断时清理 S3 下载产生的临时目录。
 * 不读取原流内容，仅透传。
 */
function withCleanup(
  source: NodeReadableStream,
  tempDirs: string[],
): NodeReadableStream {
  if (tempDirs.length === 0) return source;
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    for (const dir of tempDirs) {
      void fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  };

  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let canceled = false;

  return new NodeReadableStream<Uint8Array>({
    start(controller) {
      reader = source.getReader();
      void (async () => {
        try {
          while (!canceled) {
            const { done, value } = await reader!.read();
            if (done) {
              if (!canceled) controller.close();
              break;
            }
            if (!canceled) controller.enqueue(value);
          }
        } catch {
          // 客户端取消后 controller 可能已关闭，enqueue/error 都会抛错，全部吞掉。
          if (!canceled) {
            try {
              controller.error(new Error('download stream failed'));
            } catch {
              /* controller 已处于 closed/errored，忽略 */
            }
          }
        } finally {
          cleanup();
        }
      })();
    },
    // 客户端中断下载（网络断开 / 用户取消）时，Next.js 会调用 cancel。
    // 必须主动取消底层 reader（关闭文件 fd / 中止 S3 流），否则 fd 与临时目录泄漏；
    // 同时置 canceled，避免上面的循环在已关闭的 controller 上继续 enqueue 抛出未处理 rejection。
    cancel() {
      canceled = true;
      try {
        void reader?.cancel().catch(() => {});
      } catch {
        /* reader 可能尚未初始化或已释放 */
      }
      cleanup();
    },
  });
}
