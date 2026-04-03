import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { db } from '@/app/lib/db';
import { files, uploadTasks, uploadChunks, userStorages } from '@/app/lib/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { checkRateLimit } from '@/app/lib/rate-limit';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = Number(session.user.id);

    // Rate limiting
    const { success, remaining } = await checkRateLimit(`upload-init:${userId}`, 20, 60);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests, please try again later' },
        {
          status: 429,
          headers: { 'X-RateLimit-Remaining': remaining.toString() },
        },
      );
    }

    const body = await request.json();
    const { fileName, fileSize, fileHash, mimeType, storageId, targetPath, chunkSize } = body;

    // Validate input
    if (!fileName || !fileSize || !fileHash || !mimeType || !storageId || !targetPath) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (typeof fileSize !== 'number' || fileSize <= 0) {
      return NextResponse.json({ error: 'Invalid file size' }, { status: 400 });
    }

    // Verify storage belongs to user
    const storage = await db.query.userStorages.findFirst({
      where: and(
        eq(userStorages.id, storageId),
        eq(userStorages.userId, userId),
        isNull(userStorages.deletedAt),
      ),
    });

    if (!storage) {
      return NextResponse.json({ error: 'Storage not found' }, { status: 404 });
    }

    // Check for instant upload (file with same hash already exists)
    const existingFile = await db.query.files.findFirst({
      where: and(
        eq(files.fileHash, fileHash),
        eq(files.userStorageId, storageId),
        isNull(files.deletedAt),
      ),
    });

    if (existingFile) {
      return NextResponse.json({
        instantUpload: true,
        fileId: existingFile.id,
        message: 'File already exists, instant upload completed',
      });
    }

    // Check for existing upload task
    const existingTask = await db.query.uploadTasks.findFirst({
      where: and(
        eq(uploadTasks.fileHash, fileHash),
        eq(uploadTasks.userStorageId, storageId),
        eq(uploadTasks.status, 'uploading'),
      ),
    });

    if (existingTask) {
      // Return existing task for resumable upload
      const uploadedChunks = await db.query.uploadChunks.findMany({
        where: eq(uploadChunks.uploadTaskId, existingTask.id),
      });

      return NextResponse.json({
        uploadId: existingTask.uploadId,
        chunkSize: existingTask.chunkSize,
        totalChunks: existingTask.totalChunks,
        uploadedChunks: uploadedChunks.map((chunk) => chunk.chunkIndex),
        resumable: true,
      });
    }

    // Create new upload task
    const uploadId = uuidv4();
    const effectiveChunkSize = chunkSize || DEFAULT_CHUNK_SIZE;
    const totalChunks = Math.ceil(fileSize / effectiveChunkSize);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const [newTask] = await db
      .insert(uploadTasks)
      .values({
        uploadId,
        userStorageId: storageId,
        fileName,
        fileSize,
        fileHash,
        mimeType,
        chunkSize: effectiveChunkSize,
        totalChunks,
        targetPath,
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
    console.error('Upload init error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
