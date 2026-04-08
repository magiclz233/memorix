import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { and, count, eq, gt, isNull } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/app/lib/drizzle';
import { uploadTasks, uploadChunks, userStorages } from '@/app/lib/schema';
import { checkRateLimit } from '@/app/lib/rate-limit';

const UPLOAD_TEMP_DIR = path.resolve(process.cwd(), '.cache', 'memorix', 'upload-chunks');

function resolveHashAlgorithm(hash: string): 'md5' | 'sha256' {
  return hash.length >= 64 ? 'sha256' : 'md5';
}

export async function POST(request: NextRequest) {
  const t = await getTranslations('api.errors');

  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: t('unauthorized') }, { status: 401 });
    }

    const userId = Number(session.user.id);

    const { success, remaining } = await checkRateLimit(`upload-chunk:${userId}`, 100, 60);
    if (!success) {
      return NextResponse.json(
        { error: t('tooManyRequests') },
        {
          status: 429,
          headers: { 'X-RateLimit-Remaining': remaining.toString() },
        },
      );
    }

    const formData = await request.formData();
    const uploadId = formData.get('uploadId');
    const chunkIndexValue = formData.get('chunkIndex');
    const chunkHash = formData.get('chunkHash');
    const chunkFile = formData.get('chunk');

    const chunkIndex = Number.parseInt(String(chunkIndexValue), 10);

    if (
      typeof uploadId !== 'string' ||
      !uploadId ||
      !Number.isInteger(chunkIndex) ||
      chunkIndex < 0 ||
      typeof chunkHash !== 'string' ||
      !chunkHash ||
      !(chunkFile instanceof File)
    ) {
      return NextResponse.json({ error: t('missingRequiredFields') }, { status: 400 });
    }

    const taskResult = await db
      .select({ task: uploadTasks })
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

    const task = taskResult[0]?.task;

    if (!task) {
      return NextResponse.json({ error: t('uploadTaskNotFound') }, { status: 404 });
    }

    if (task.status !== 'uploading' || task.expiresAt <= new Date()) {
      return NextResponse.json({ error: t('uploadTaskNotActive') }, { status: 400 });
    }

    if (chunkIndex >= task.totalChunks) {
      return NextResponse.json({ error: t('missingRequiredFields') }, { status: 400 });
    }

    if (chunkFile.size > task.chunkSize) {
      return NextResponse.json({ error: t('invalidFileSize') }, { status: 400 });
    }

    const existingChunk = await db.query.uploadChunks.findFirst({
      where: and(
        eq(uploadChunks.uploadTaskId, task.id),
        eq(uploadChunks.chunkIndex, chunkIndex),
      ),
    });

    if (existingChunk?.status === 'uploaded') {
      return NextResponse.json({
        success: true,
        chunkIndex,
        uploadedChunks: task.uploadedChunks,
        totalChunks: task.totalChunks,
      });
    }

    const chunkBuffer = Buffer.from(await chunkFile.arrayBuffer());
    const algorithm = resolveHashAlgorithm(chunkHash);
    const actualHash = crypto.createHash(algorithm).update(chunkBuffer).digest('hex');
    if (actualHash !== chunkHash) {
      return NextResponse.json({ error: t('chunkHashMismatch') }, { status: 400 });
    }

    const taskTempDir = path.join(UPLOAD_TEMP_DIR, uploadId);
    await fs.mkdir(taskTempDir, { recursive: true });

    const chunkPath = path.join(taskTempDir, `chunk_${chunkIndex}`);
    await fs.writeFile(chunkPath, chunkBuffer);

    if (existingChunk) {
      await db
        .update(uploadChunks)
        .set({
          chunkHash,
          chunkSize: chunkBuffer.length,
          storagePath: chunkPath,
          status: 'uploaded',
          updatedAt: new Date(),
        })
        .where(eq(uploadChunks.id, existingChunk.id));
    } else {
      await db.insert(uploadChunks).values({
        uploadTaskId: task.id,
        chunkIndex,
        chunkHash,
        chunkSize: chunkBuffer.length,
        storagePath: chunkPath,
        status: 'uploaded',
      });
    }

    const uploadedCountResult = await db
      .select({ count: count() })
      .from(uploadChunks)
      .where(
        and(
          eq(uploadChunks.uploadTaskId, task.id),
          eq(uploadChunks.status, 'uploaded'),
        ),
      );

    const uploadedChunks = Number(uploadedCountResult[0]?.count ?? 0);

    await db
      .update(uploadTasks)
      .set({
        uploadedChunks,
        updatedAt: new Date(),
      })
      .where(and(eq(uploadTasks.id, task.id), gt(uploadTasks.expiresAt, new Date())));

    return NextResponse.json({
      success: true,
      chunkIndex,
      uploadedChunks,
      totalChunks: task.totalChunks,
    });
  } catch (error) {
    console.error('upload.chunk', error);
    return NextResponse.json({ error: t('internalServerError') }, { status: 500 });
  }
}