import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { db } from '@/app/lib/db';
import { uploadTasks, uploadChunks } from '@/app/lib/schema';
import { eq, and } from 'drizzle-orm';
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
    const { success, remaining } = await checkRateLimit(`upload-chunk:${userId}`, 100, 60);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests, please try again later' },
        {
          status: 429,
          headers: { 'X-RateLimit-Remaining': remaining.toString() },
        },
      );
    }

    const formData = await request.formData();
    const uploadId = formData.get('uploadId') as string;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string, 10);
    const chunkHash = formData.get('chunkHash') as string;
    const chunkFile = formData.get('chunk') as File;

    // Validate input
    if (!uploadId || isNaN(chunkIndex) || !chunkHash || !chunkFile) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

    // Check if chunk already uploaded
    const existingChunk = await db.query.uploadChunks.findFirst({
      where: and(
        eq(uploadChunks.uploadTaskId, task.id),
        eq(uploadChunks.chunkIndex, chunkIndex),
      ),
    });

    if (existingChunk && existingChunk.status === 'uploaded') {
      return NextResponse.json({
        success: true,
        chunkIndex,
        message: 'Chunk already uploaded',
      });
    }

    // Read chunk data
    const chunkBuffer = Buffer.from(await chunkFile.arrayBuffer());

    // Verify chunk hash
    const actualHash = crypto.createHash('md5').update(chunkBuffer).digest('hex');
    if (actualHash !== chunkHash) {
      return NextResponse.json({ error: 'Chunk hash mismatch' }, { status: 400 });
    }

    // Ensure temp directory exists
    const taskTempDir = path.join(UPLOAD_TEMP_DIR, uploadId);
    await fs.mkdir(taskTempDir, { recursive: true });

    // Save chunk to temp storage
    const chunkPath = path.join(taskTempDir, `chunk_${chunkIndex}`);
    await fs.writeFile(chunkPath, chunkBuffer);

    // Record chunk in database
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

    // Update task progress
    const uploadedChunksCount = await db.query.uploadChunks.findMany({
      where: and(
        eq(uploadChunks.uploadTaskId, task.id),
        eq(uploadChunks.status, 'uploaded'),
      ),
    });

    await db
      .update(uploadTasks)
      .set({
        uploadedChunks: uploadedChunksCount.length,
        updatedAt: new Date(),
      })
      .where(eq(uploadTasks.id, task.id));

    return NextResponse.json({
      success: true,
      chunkIndex,
      uploadedChunks: uploadedChunksCount.length,
      totalChunks: task.totalChunks,
    });
  } catch (error) {
    console.error('Upload chunk error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
