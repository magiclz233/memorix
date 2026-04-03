import path from 'path';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { v4 as uuidv4 } from 'uuid';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/app/lib/drizzle';
import { files, uploadTasks, uploadChunks, userStorages } from '@/app/lib/schema';
import { checkRateLimit } from '@/app/lib/rate-limit';

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const MIN_CHUNK_SIZE = 1 * 1024 * 1024; // 1MB
const MAX_CHUNK_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024 * 1024; // 5GB

function sanitizeFileName(fileName: string) {
  const baseName = path.basename(fileName).trim();
  const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return sanitized || 'upload.bin';
}

function normalizeTargetDirectory(targetPath: unknown): string | null {
  if (typeof targetPath !== 'string') {
    return '';
  }

  const normalizedInput = targetPath.replace(/\\/g, '/').trim();
  if (!normalizedInput || normalizedInput === '/') {
    return '';
  }

  const withoutLeadingSlash = normalizedInput.replace(/^\/+/, '');
  const normalized = path.posix.normalize(withoutLeadingSlash);

  if (normalized === '.' || normalized === '') {
    return '';
  }

  if (
    path.posix.isAbsolute(normalized) ||
    normalized.startsWith('../') ||
    normalized.includes('/../')
  ) {
    return null;
  }

  return normalized;
}

function buildRelativeUploadPath(targetDir: string, fileName: string) {
  const safeName = sanitizeFileName(fileName);
  const ext = path.extname(safeName);
  const baseName = path.basename(safeName, ext).slice(0, 120) || 'upload';
  const suffix = crypto.randomBytes(4).toString('hex');
  const uniqueName = `${Date.now()}_${suffix}_${baseName}${ext}`;
  return targetDir ? path.posix.join(targetDir, uniqueName) : uniqueName;
}

function resolveChunkSize(chunkSize: unknown) {
  const numeric = typeof chunkSize === 'number' ? chunkSize : Number(chunkSize);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return DEFAULT_CHUNK_SIZE;
  }
  return Math.min(MAX_CHUNK_SIZE, Math.max(MIN_CHUNK_SIZE, Math.floor(numeric)));
}

export async function POST(request: NextRequest) {
  const t = await getTranslations('api.errors');
  const tUpload = await getTranslations('api.upload');

  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: t('unauthorized') }, { status: 401 });
    }

    const userId = Number(session.user.id);

    const { success, remaining } = await checkRateLimit(`upload-init:${userId}`, 20, 60);
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
    const { fileName, fileSize, fileHash, mimeType, storageId, targetPath, chunkSize } =
      body as Record<string, unknown>;

    if (
      typeof fileName !== 'string' ||
      typeof fileHash !== 'string' ||
      typeof mimeType !== 'string' ||
      !storageId
    ) {
      return NextResponse.json({ error: t('missingRequiredFields') }, { status: 400 });
    }

    if (typeof fileSize !== 'number' || !Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json({ error: t('invalidFileSize') }, { status: 400 });
    }

    if (fileSize > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: tUpload('fileTooLarge', { maxSize: '5GB' }) },
        { status: 400 },
      );
    }

    const normalizedTargetDir = normalizeTargetDirectory(targetPath);
    if (normalizedTargetDir === null) {
      return NextResponse.json({ error: t('pathInvalid') }, { status: 400 });
    }

    const numericStorageId = Number(storageId);
    if (!Number.isInteger(numericStorageId) || numericStorageId <= 0) {
      return NextResponse.json({ error: t('missingRequiredFields') }, { status: 400 });
    }

    const storage = await db.query.userStorages.findFirst({
      where: and(
        eq(userStorages.id, numericStorageId),
        eq(userStorages.userId, userId),
        isNull(userStorages.deletedAt),
      ),
    });

    if (!storage) {
      return NextResponse.json({ error: tUpload('storageNotFound') }, { status: 404 });
    }

    if (storage.type !== 'local' && storage.type !== 'nas') {
      return NextResponse.json({ error: tUpload('unsupportedStorageType') }, { status: 400 });
    }

    const existingFile = await db.query.files.findFirst({
      where: and(
        eq(files.fileHash, fileHash),
        eq(files.userStorageId, numericStorageId),
        isNull(files.deletedAt),
      ),
    });

    if (existingFile) {
      return NextResponse.json({
        instantUpload: true,
        fileId: existingFile.id,
      });
    }

    const existingTask = await db.query.uploadTasks.findFirst({
      where: and(
        eq(uploadTasks.fileHash, fileHash),
        eq(uploadTasks.userStorageId, numericStorageId),
        eq(uploadTasks.status, 'uploading'),
        gt(uploadTasks.expiresAt, new Date()),
      ),
    });

    if (existingTask) {
      const uploadedChunks = await db.query.uploadChunks.findMany({
        where: and(
          eq(uploadChunks.uploadTaskId, existingTask.id),
          eq(uploadChunks.status, 'uploaded'),
        ),
      });

      return NextResponse.json({
        uploadId: existingTask.uploadId,
        chunkSize: existingTask.chunkSize,
        totalChunks: existingTask.totalChunks,
        uploadedChunks: uploadedChunks.map((chunk) => chunk.chunkIndex),
        resumable: true,
      });
    }

    const uploadId = uuidv4();
    const effectiveChunkSize = resolveChunkSize(chunkSize);
    const totalChunks = Math.ceil(fileSize / effectiveChunkSize);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const finalRelativePath = buildRelativeUploadPath(normalizedTargetDir, fileName);

    const [newTask] = await db
      .insert(uploadTasks)
      .values({
        uploadId,
        userStorageId: numericStorageId,
        fileName,
        fileSize,
        fileHash,
        mimeType,
        chunkSize: effectiveChunkSize,
        totalChunks,
        targetPath: finalRelativePath,
        status: 'uploading',
        expiresAt,
      })
      .returning();

    return NextResponse.json({
      uploadId: newTask.uploadId,
      chunkSize: effectiveChunkSize,
      totalChunks,
      uploadedChunks: [],
      resumable: false,
    });
  } catch (error) {
    console.error('upload.init', error);
    return NextResponse.json({ error: t('internalServerError') }, { status: 500 });
  }
}