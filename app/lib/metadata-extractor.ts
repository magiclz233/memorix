import path from 'path';
import fs from 'fs/promises';
import pRetry from 'p-retry';
import { db } from './drizzle';
import {
  files,
  photoMetadata,
  videoMetadata,
  metadataExtractionFailures,
  userStorages,
} from './schema';
import { eq, lt } from 'drizzle-orm';
import {
  getStorageCacheRoot,
  readPhotoMetadata,
} from './storage';
import { generateImageThumbnail } from './image-preview';
import { generateVideoPoster, probeVideoMetadata } from './video';

/**
 * 提取照片元数据
 * @param fileId 文件 ID
 * @param absolutePath 文件绝对路径
 * @param storageId 存储源 ID
 */
export async function extractPhotoMetadata(
  fileId: number,
  absolutePath: string,
  storageId: number,
): Promise<void> {
  const thumbRoot = getStorageCacheRoot(storageId);
  const thumbPath = path.join(thumbRoot, `${fileId}.webp`);

  await fs.mkdir(thumbRoot, { recursive: true });

  await db.delete(videoMetadata).where(eq(videoMetadata.fileId, fileId));

  const metadata = await readPhotoMetadata(absolutePath);
  const thumbnail = await generateImageThumbnail(absolutePath, thumbPath);
  const fileBlurHash = thumbnail?.blurHash ?? null;

  const liveType = metadata?.motionPhoto ? 'google' : 'none';

  await db
    .insert(photoMetadata)
    .values({
      fileId,
      description: metadata?.description ?? null,
      camera: metadata?.camera ?? null,
      maker: metadata?.maker ?? null,
      lens: metadata?.lens ?? null,
      dateShot: metadata?.dateShot ?? null,
      exposure: metadata?.exposure ?? null,
      aperture: metadata?.aperture ?? null,
      iso: metadata?.iso ?? null,
      focalLength: metadata?.focalLength ?? null,
      whiteBalance: metadata?.whiteBalance ?? null,
      gpsLatitude: metadata?.gpsLatitude ?? null,
      gpsLongitude: metadata?.gpsLongitude ?? null,
      resolutionWidth: metadata?.resolutionWidth ?? null,
      resolutionHeight: metadata?.resolutionHeight ?? null,
      liveType,
      pairedPath: null,
    })
    .onConflictDoUpdate({
      target: [photoMetadata.fileId],
      set: {
        description: metadata?.description ?? null,
        camera: metadata?.camera ?? null,
        maker: metadata?.maker ?? null,
        lens: metadata?.lens ?? null,
        dateShot: metadata?.dateShot ?? null,
        exposure: metadata?.exposure ?? null,
        aperture: metadata?.aperture ?? null,
        iso: metadata?.iso ?? null,
        focalLength: metadata?.focalLength ?? null,
        whiteBalance: metadata?.whiteBalance ?? null,
        gpsLatitude: metadata?.gpsLatitude ?? null,
        gpsLongitude: metadata?.gpsLongitude ?? null,
        resolutionWidth: metadata?.resolutionWidth ?? null,
        resolutionHeight: metadata?.resolutionHeight ?? null,
        liveType,
        pairedPath: null,
      },
    });

  if (fileBlurHash) {
    await db.update(files).set({ blurHash: fileBlurHash }).where(eq(files.id, fileId));
  }
}

/**
 * 提取视频元数据
 * @param fileId 文件 ID
 * @param absolutePath 文件绝对路径
 * @param storageId 存储源 ID
 */
export async function extractVideoMetadata(
  fileId: number,
  absolutePath: string,
  storageId: number,
): Promise<void> {
  const thumbRoot = getStorageCacheRoot(storageId);
  const thumbPath = path.join(thumbRoot, `${fileId}.webp`);

  await fs.mkdir(thumbRoot, { recursive: true });

  await db.delete(photoMetadata).where(eq(photoMetadata.fileId, fileId));

  const videoInfo = await probeVideoMetadata(absolutePath);
  const poster = await generateVideoPoster(absolutePath, thumbPath, videoInfo?.duration ?? null);

  const fileBlurHash = poster?.blurHash ?? null;

  if (videoInfo) {
    await db
      .insert(videoMetadata)
      .values({
        fileId,
        duration: videoInfo.duration ?? null,
        width: videoInfo.width ?? null,
        height: videoInfo.height ?? null,
        bitrate: videoInfo.bitrate ?? null,
        fps: videoInfo.fps ?? null,
        frameCount: videoInfo.frameCount ?? null,
        codecVideo: videoInfo.codecVideo ?? null,
        codecAudio: videoInfo.codecAudio ?? null,
      })
      .onConflictDoUpdate({
        target: [videoMetadata.fileId],
        set: {
          duration: videoInfo.duration ?? null,
          width: videoInfo.width ?? null,
          height: videoInfo.height ?? null,
          bitrate: videoInfo.bitrate ?? null,
          fps: videoInfo.fps ?? null,
          frameCount: videoInfo.frameCount ?? null,
          codecVideo: videoInfo.codecVideo ?? null,
          codecAudio: videoInfo.codecAudio ?? null,
        },
      });
  }

  if (fileBlurHash) {
    await db.update(files).set({ blurHash: fileBlurHash }).where(eq(files.id, fileId));
  }
}

async function recordExtractionFailure(fileId: number, errorMessage: string) {
  const existing = await db.query.metadataExtractionFailures.findFirst({
    where: eq(metadataExtractionFailures.fileId, fileId),
    orderBy: (table, { desc: descFn }) => [descFn(table.lastAttemptAt)],
  });

  const nextAttemptCount = (existing?.attemptCount ?? 0) + 1;

  // Keep only the latest failure record per file
  await clearFailedExtraction(fileId);

  await db.insert(metadataExtractionFailures).values({
    fileId,
    errorMessage,
    attemptCount: nextAttemptCount,
    lastAttemptAt: new Date(),
  });
}

/**
 * 异步提取元数据（不阻塞主流程）
 * @param fileId 文件 ID
 * @param absolutePath 文件绝对路径
 * @param mediaType 媒体类型
 * @param storageId 存储源 ID
 */
export async function extractMetadataAsync(
  fileId: number,
  absolutePath: string,
  mediaType: string,
  storageId: number,
): Promise<void> {
  try {
    await pRetry(
      async () => {
        if (mediaType === 'video') {
          await extractVideoMetadata(fileId, absolutePath, storageId);
        } else {
          await extractPhotoMetadata(fileId, absolutePath, storageId);
        }
      },
      {
        retries: 3,
        minTimeout: 1000,
        maxTimeout: 5000,
        onFailedAttempt: (context) => {
          console.warn(
            `Metadata extraction attempt ${context.attemptNumber} failed for file ${fileId}:`,
            context.error instanceof Error ? context.error.message : String(context.error),
          );
        },
      },
    );

    await clearFailedExtraction(fileId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    try {
      await recordExtractionFailure(fileId, errorMessage);
    } catch (dbError) {
      console.error('metadata.recordFailure', dbError, { fileId });
    }

    console.error('metadata.extract', error, { fileId, storageId, mediaType });
    throw error instanceof Error ? error : new Error(errorMessage);
  }
}

/**
 * 重试失败的元数据提取
 * @param maxAttempts 最大尝试次数
 */
export async function retryFailedExtractions(maxAttempts: number = 5) {
  const failures = await db.query.metadataExtractionFailures.findMany({
    where: lt(metadataExtractionFailures.attemptCount, maxAttempts),
    orderBy: (table, { desc: descFn }) => [descFn(table.lastAttemptAt)],
  });

  const latestFailuresByFile = new Map<number, (typeof failures)[number]>();
  for (const failure of failures) {
    if (!latestFailuresByFile.has(failure.fileId)) {
      latestFailuresByFile.set(failure.fileId, failure);
    }
  }

  const results = {
    total: latestFailuresByFile.size,
    succeeded: 0,
    failed: 0,
  };

  for (const failure of latestFailuresByFile.values()) {
    try {
      const file = await db.query.files.findFirst({
        where: eq(files.id, failure.fileId),
      });

      if (!file) {
        await clearFailedExtraction(failure.fileId);
        continue;
      }

      const storage = await db.query.userStorages.findFirst({
        where: eq(userStorages.id, file.userStorageId),
      });

      if (!storage) {
        await recordExtractionFailure(file.id, 'Storage not found');
        results.failed += 1;
        continue;
      }

      if (storage.type !== 'local' && storage.type !== 'nas') {
        await recordExtractionFailure(file.id, 'S3 metadata retry is not supported yet');
        results.failed += 1;
        continue;
      }

      const storageConfig = storage.config as Record<string, unknown>;
      const rootPath = storageConfig.rootPath as string;
      const absolutePath = path.join(rootPath, file.path);

      await extractMetadataAsync(file.id, absolutePath, file.mediaType, file.userStorageId);
      results.succeeded += 1;
    } catch (error) {
      console.error('metadata.retry', error, { fileId: failure.fileId });
      results.failed += 1;
    }
  }

  return results;
}

/**
 * 获取所有失败的元数据提取记录
 */
export async function getFailedExtractions() {
  return db.query.metadataExtractionFailures.findMany({
    orderBy: (table, { desc: descFn }) => [descFn(table.lastAttemptAt)],
  });
}

/**
 * 清除指定文件的失败记录
 */
export async function clearFailedExtraction(fileId: number) {
  await db.delete(metadataExtractionFailures).where(eq(metadataExtractionFailures.fileId, fileId));
}