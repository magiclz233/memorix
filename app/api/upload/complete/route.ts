import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { db } from '@/app/lib/db';
import { uploadTasks, uploadChunks, files, userStorages } from '@/app/lib/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { checkRateLimit } from '@/app/lib/rate-limit';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_TEMP_DIR = path.resolve(process.cwd(), '.cache', 'memorix', 'upload-chunks');

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = Number(session.user.id);

    // Rate limiting
    const { success, remaining } = await checkRateLimit(`upload-complete:${userId}`, 20, 60);
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
    const { uploadId } = body;

    if (!uploadId) {
      return NextResponse.json({ error: 'Missing uploadId' }, { status: 400 });
    }

    // Find upload task
    const task = await db.query.uploadTasks.findFirst({
      where: eq(uploadTasks.uploadId, uploadId),
    });

    if (!task) {
      return NextResponse.json({ error: 'Upload task not found' }, { status: 404 });
    }

    if (task.status !== 'uploading') {
      return NextResponse.json({ error: 'Upload task is not active' }, { status: 400 });
    }

    // Verify storage belongs to user
    const storage = await db.query.userStorages.findFirst({
      where: and(
        eq(userStorages.id, task.userStorageId),
        eq(userStorages.userId, userId),
        isNull(userStorages.deletedAt),
      ),
    });

    if (!storage) {
      return NextResponse.json({ error: 'Storage not found' }, { status: 404 });
    }

    // Get all uploaded chunks
    const chunks = await db.query.uploadChunks.findMany({
      where: and(
        eq(uploadChunks.uploadTaskId, task.id),
        eq(uploadChunks.status, 'uploaded'),
      ),
      orderBy: (uploadChunks, { asc }) => [asc(uploadChunks.chunkIndex)],
    });

    if (chunks.length !== task.totalChunks) {
      return NextResponse.json(
        {
          error: 'Not all chunks uploaded',
          uploadedChunks: chunks.length,
          totalChunks: task.totalChunks,
        },
        { status: 400 },
      );
    }

    // Merge chunks into final file
    const taskTempDir = path.join(UPLOAD_TEMP_DIR, uploadId);
    const finalFilePath = path.join(taskTempDir, 'merged_file');
    const writeStream = await fs.open(finalFilePath, 'w');

    try {
      for (const chunk of chunks) {
        const chunkData = await fs.readFile(chunk.storagePath);
        await writeStream.write(chunkData);
      }
    } finally {
      await writeStream.close();
    }

    // Verify final file hash
    const finalFileBuffer = await fs.readFile(finalFilePath);
    const finalHash = crypto.createHash('md5').update(finalFileBuffer).digest('hex');

    if (finalHash !== task.fileHash) {
      await db
        .update(uploadTasks)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(uploadTasks.id, task.id));

      return NextResponse.json({ error: 'File hash verification failed' }, { status: 400 });
    }

    // Move file to final storage location
    const storageConfig = storage.config as Record<string, unknown>;
    const storageType = storage.type;

    let finalStoragePath: string;
    let fileUrl: string;

    if (storageType === 'local' || storageType === 'nas') {
      const rootPath = storageConfig.rootPath as string;
      finalStoragePath = path.join(rootPath, task.targetPath);

      // Ensure target directory exists
      await fs.mkdir(path.dirname(finalStoragePath), { recursive: true });

      // Move file to final location
      await fs.rename(finalFilePath, finalStoragePath);

      fileUrl = `/api/storage/local/${task.userStorageId}/${task.targetPath}`;
    } else {
      // For S3-compatible storage, would need to upload to S3 here
      // This is a simplified version - actual implementation would use S3 SDK
      throw new Error('S3 storage not yet implemented for chunked upload');
    }

    // Get file stats
    const fileStats = await fs.stat(finalStoragePath);

    // Determine media type
    const mimeType = task.mimeType;
    const mediaType = mimeType.startsWith('video/')
      ? 'video'
      : mimeType === 'image/gif'
        ? 'animated'
        : 'image';

    // Create file record in database
    const [newFile] = await db
      .insert(files)
      .values({
        title: task.fileName,
        path: task.targetPath,
        sourceType: storageType,
        size: task.fileSize,
        mimeType: task.mimeType,
        mtime: fileStats.mtime,
        url: fileUrl,
        userStorageId: task.userStorageId,
        mediaType,
        fileHash: task.fileHash,
        isPublished: false,
      })
      .returning();

    // Update task status
    await db
      .update(uploadTasks)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(eq(uploadTasks.id, task.id));

    // Clean up temp files
    try {
      await fs.rm(taskTempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up temp files:', error);
    }

    return NextResponse.json({
      success: true,
      fileId: newFile.id,
      file: {
        id: newFile.id,
        title: newFile.title,
        url: newFile.url,
        mimeType: newFile.mimeType,
        size: newFile.size,
      },
    });
  } catch (error) {
    console.error('Upload complete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
