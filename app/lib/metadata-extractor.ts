import path from 'path';
import fs from 'fs/promises';
import { db } from './drizzle';
import { files, photoMetadata, videoMetadata } from './schema';
import { eq } from 'drizzle-orm';
import { getStorageCacheRoot, readPhotoMetadata, detectMotionPhotoInfo } from './storage';
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
  storageId: number
): Promise<void> {
  const thumbRoot = getStorageCacheRoot(storageId);
  const thumbPath = path.join(thumbRoot, `${fileId}.webp`);

  // 确保缩略图目录存在
  await fs.mkdir(thumbRoot, { recursive: true });

  // 删除可能存在的视频元数据
  await db.delete(videoMetadata).where(eq(videoMetadata.fileId, fileId));

  // 提取照片元数据
  const metadata = await readPhotoMetadata(absolutePath);
  const thumbnail = await generateImageThumbnail(absolutePath, thumbPath);
  const fileBlurHash = thumbnail?.blurHash ?? null;

  // 检测实况照片
  const motionInfo = await detectMotionPhotoInfo(absolutePath);
  const liveType =
    motionInfo?.type === 'google'
      ? 'google'
      : motionInfo?.type === 'apple'
        ? 'apple'
        : 'none';

  // 插入或更新照片元数据
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
      pairedPath: motionInfo?.videoPath ?? null,
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
        pairedPath: motionInfo?.videoPath ?? null,
      },
    });

  // 更新文件的 BlurHash
  if (fileBlurHash) {
    await db
      .update(files)
      .set({ blurHash: fileBlurHash })
      .where(eq(files.id, fileId));
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
  storageId: number
): Promise<void> {
  const thumbRoot = getStorageCacheRoot(storageId);
  const thumbPath = path.join(thumbRoot, `${fileId}.webp`);

  // 确保缩略图目录存在
  await fs.mkdir(thumbRoot, { recursive: true });

  // 删除可能存在的照片元数据
  await db.delete(photoMetadata).where(eq(photoMetadata.fileId, fileId));

  // 提取视频信息
  const videoInfo = await probeVideoMetadata(absolutePath);
  const poster = await generateVideoPoster(
    absolutePath,
    thumbPath,
    videoInfo?.duration ?? null
  );

  const fileBlurHash = poster?.blurHash ?? null;

  // 插入或更新视频元数据
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

  // 更新文件的 BlurHash
  if (fileBlurHash) {
    await db
      .update(files)
      .set({ blurHash: fileBlurHash })
      .where(eq(files.id, fileId));
  }
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
  storageId: number
): Promise<void> {
  try {
    if (mediaType === 'video') {
      await extractVideoMetadata(fileId, absolutePath, storageId);
    } else {
      await extractPhotoMetadata(fileId, absolutePath, storageId);
    }
  } catch (error) {
    console.error(`Failed to extract metadata for file ${fileId}:`, error);
    throw error;
  }
}
