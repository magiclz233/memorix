import { createReadStream } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { and, eq, isNull } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/app/lib/drizzle';
import { uploadTasks, uploadChunks, files, userStorages } from '@/app/lib/schema';
import { checkRateLimit } from '@/app/lib/rate-limit';
import { processSingleFileMetadata } from '@/app/lib/storage-scan';

const UPLOAD_TEMP_DIR = path.resolve(process.cwd(), '.cache', 'memorix', 'upload-chunks');

const normalizeForComparison = (value: string) =>
  process.platform === 'win32' ? value.toLowerCase() : value;

function isSafePath(rootPath: string, targetPath: string) {
  const normalizedRoot = normalizeForComparison(path.resolve(rootPath));
  const normalizedTarget = normalizeForComparison(path.resolve(targetPath));
  return (
    normalizedTarget === normalizedRoot ||
    normalizedTarget.startsWith(`${normalizedRoot}${path.sep}`)
  );
}

async function calculateFileHash(filePath: string, algorithm: 'md5' | 'sha256') {
  const hash = crypto.createHash(algorithm);
  const stream = createReadStream(filePath);
  for await (const chunk of stream) {
    hash.update(chunk as Buffer);
  }
  return hash.digest('hex');
}

async function moveFileWithFallback(source: string, target: string) {
  try {
    await fs.rename(source, target);
  } catch (error) {
    if (
      !(
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: string }).code === 'EXDEV'
      )
    ) {
      throw error;
    }
    await fs.copyFile(source, target);
    await fs.unlink(source);
  }
}

export async function POST(request: NextRequest) {
  const t = await getTranslations('api.errors');
  const tUpload = await getTranslations('api.upload');
  let taskId: number | null = null;

  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: t('unauthorized') }, { status: 401 });
    }

    const userId = Number(session.user.id);

    const { success, remaining } = await checkRateLimit(`upload-complete:${userId}`, 20, 60);
    if (!success) {
      return NextResponse.json(
        { error: t('tooManyRequests') },
        {
          status: 429,
          headers: { 'X-RateLimit-Remaining': remaining.toString() },
        },
      );
    }

    const body = await request.json();
    const uploadId = typeof body?.uploadId === 'string' ? body.uploadId : '';

    if (!uploadId) {
      return NextResponse.json({ error: t('missingUploadId') }, { status: 400 });
    }

    const taskResult = await db
      .select({ task: uploadTasks, storage: userStorages })
      .from(uploadTasks)
      .innerJoin(userStorages, eq(uploadTasks.userStorageId, userStorages.id))
      .where(
        and(
          eq(uploadTasks.uploadId, uploadId),
          eq(userStorages.userId, userId),
          isNull(userStorages.deletedAt),
        ),
      )
      .limit(1);

    const taskRow = taskResult[0];
    const task = taskRow?.task;
    const storage = taskRow?.storage;

    if (!task || !storage) {
      return NextResponse.json({ error: t('uploadTaskNotFound') }, { status: 404 });
    }

    taskId = task.id;

    if (task.status !== 'uploading' || task.expiresAt <= new Date()) {
      return NextResponse.json({ error: t('uploadTaskNotActive') }, { status: 400 });
    }

    if (storage.type !== 'local' && storage.type !== 'nas') {
      return NextResponse.json({ error: tUpload('unsupportedStorageType') }, { status: 400 });
    }

    const chunks = await db.query.uploadChunks.findMany({
      where: and(
        eq(uploadChunks.uploadTaskId, task.id),
        eq(uploadChunks.status, 'uploaded'),
      ),
      orderBy: (table, { asc }) => [asc(table.chunkIndex)],
    });

    if (chunks.length !== task.totalChunks) {
      return NextResponse.json(
        {
          error: t('notAllChunksUploaded'),
          uploadedChunks: chunks.length,
          totalChunks: task.totalChunks,
        },
        { status: 400 },
      );
    }

    const taskTempDir = path.join(UPLOAD_TEMP_DIR, uploadId);
    const mergedFilePath = path.join(taskTempDir, 'merged_file');
    const writeHandle = await fs.open(mergedFilePath, 'w');

    try {
      for (const chunk of chunks) {
        const chunkData = await fs.readFile(chunk.storagePath);
        await writeHandle.write(chunkData);
      }
    } finally {
      await writeHandle.close();
    }

    const hashAlgorithm: 'md5' | 'sha256' = task.fileHash.length >= 64 ? 'sha256' : 'md5';
    const mergedFileHash = await calculateFileHash(mergedFilePath, hashAlgorithm);
    if (mergedFileHash !== task.fileHash) {
      await db
        .update(uploadTasks)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(uploadTasks.id, task.id));

      return NextResponse.json({ error: t('fileHashVerificationFailed') }, { status: 400 });
    }

    const storageConfig = storage.config as Record<string, unknown>;
    const rootPath = typeof storageConfig.rootPath === 'string' ? storageConfig.rootPath.trim() : '';

    if (!rootPath) {
      return NextResponse.json({ error: t('rootNotConfigured') }, { status: 500 });
    }

    const normalizedRootPath = path.resolve(rootPath);
    const finalStoragePath = path.resolve(normalizedRootPath, task.targetPath);

    if (!isSafePath(normalizedRootPath, finalStoragePath)) {
      return NextResponse.json({ error: t('pathInvalid') }, { status: 400 });
    }

    await fs.mkdir(path.dirname(finalStoragePath), { recursive: true });
    await moveFileWithFallback(mergedFilePath, finalStoragePath);

    const fileStats = await fs.stat(finalStoragePath);
    const mediaType = task.mimeType.startsWith('video/')
      ? 'video'
      : task.mimeType === 'image/gif'
        ? 'animated'
        : 'image';

    const [createdFile] = await db
      .insert(files)
      .values({
        title: task.fileName,
        path: task.targetPath,
        sourceType: storage.type,
        size: fileStats.size,
        mimeType: task.mimeType,
        mtime: fileStats.mtime,
        userStorageId: task.userStorageId,
        mediaType,
        fileHash: task.fileHash,
        isPublished: false,
      })
      .returning({
        id: files.id,
        title: files.title,
        mimeType: files.mimeType,
        size: files.size,
      });

    const fileUrl =
      mediaType === 'video'
        ? `/api/media/stream/${createdFile.id}`
        : `/api/local-files/${createdFile.id}`;

    await db
      .update(files)
      .set({
        url: fileUrl,
        thumbUrl: `/api/media/thumb/${createdFile.id}`,
        updatedAt: new Date(),
      })
      .where(eq(files.id, createdFile.id));

    // 异步提取元数据（不阻塞响应）
    processSingleFileMetadata(
      createdFile.id,
      finalStoragePath,
      task.fileName,
      task.mimeType,
      task.userStorageId,
    ).catch((error) => {
      console.error('upload.extractMetadata', error, { fileId: createdFile.id });
    });

    await db
      .update(uploadTasks)
      .set({ status: 'completed', updatedAt: new Date(), uploadedChunks: task.totalChunks })
      .where(eq(uploadTasks.id, task.id));

    await db.delete(uploadChunks).where(eq(uploadChunks.uploadTaskId, task.id));

    await fs.rm(taskTempDir, { recursive: true, force: true }).catch(() => {});

    return NextResponse.json({
      success: true,
      fileId: createdFile.id,
      file: {
        id: createdFile.id,
        title: createdFile.title,
        url: fileUrl,
        mimeType: createdFile.mimeType,
        size: createdFile.size,
      },
    });
  } catch (error) {
    if (taskId) {
      await db
        .update(uploadTasks)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(uploadTasks.id, taskId))
        .catch(() => {});
    }

    console.error('upload.complete', error, { taskId });
    return NextResponse.json({ error: t('internalServerError') }, { status: 500 });
  }
}