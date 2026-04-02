import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/app/lib/drizzle';
import { files, photoMetadata, videoMetadata, userStorages } from '@/app/lib/schema';
import { and, eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs/promises';
import { getImageMimeType, getVideoMimeType, getStorageCacheRoot } from '@/app/lib/storage';
import { generateImageThumbnail } from '@/app/lib/image-preview';
import { generateVideoPoster, probeVideoMetadata } from '@/app/lib/video';
import { readPhotoMetadata, detectMotionPhotoInfo } from '@/app/lib/storage';
import { getTranslations } from 'next-intl/server';

// 文件大小限制：500MB
const MAX_FILE_SIZE = 500 * 1024 * 1024;

// 支持的文件类型
const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];
const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];

type UploadResult = {
  success: boolean;
  fileName: string;
  fileId?: number;
  error?: string;
};

export async function POST(request: NextRequest) {
  try {
    // 1. 验证用户权限
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = Number(session.user.id);
    const t = await getTranslations('api.upload');

    // 2. 解析 FormData
    const formData = await request.formData();
    const storageId = Number(formData.get('storageId'));
    const uploadedFiles = formData.getAll('files') as File[];

    if (!storageId || !uploadedFiles.length) {
      return NextResponse.json(
        { error: t('missingParameters') },
        { status: 400 }
      );
    }

    // 3. 验证存储源
    const storage = await db.query.userStorages.findFirst({
      where: and(
        eq(userStorages.id, storageId),
        eq(userStorages.userId, userId)
      ),
    });

    if (!storage) {
      return NextResponse.json(
        { error: t('storageNotFound') },
        { status: 404 }
      );
    }

    const storageConfig = storage.config as { isDisabled?: boolean; basePath?: string };
    if (storageConfig.isDisabled) {
      return NextResponse.json(
        { error: t('storageDisabled') },
        { status: 400 }
      );
    }

    // 4. 处理每个文件
    const results: UploadResult[] = [];

    for (const file of uploadedFiles) {
      try {
        // 验证文件大小
        if (file.size > MAX_FILE_SIZE) {
          results.push({
            success: false,
            fileName: file.name,
            error: t('fileTooLarge', { maxSize: '500MB' }),
          });
          continue;
        }

        // 验证文件类型
        const ext = path.extname(file.name).toLowerCase();
        const isImage = SUPPORTED_IMAGE_EXTENSIONS.includes(ext);
        const isVideo = SUPPORTED_VIDEO_EXTENSIONS.includes(ext);

        if (!isImage && !isVideo) {
          results.push({
            success: false,
            fileName: file.name,
            error: t('unsupportedFileType'),
          });
          continue;
        }

        // 确定媒体类型
        const mediaType = isImage ? 'image' : 'video';
        const mimeType = isImage ? getImageMimeType(file.name) : getVideoMimeType(file.name);

        // 5. 保存文件到存储源
        let filePath: string;
        let absolutePath: string;

        if (storage.type === 'local' || storage.type === 'nas') {
          // 本地或 NAS 存储
          const basePath = storageConfig.basePath || '';
          if (!basePath) {
            results.push({
              success: false,
              fileName: file.name,
              error: t('storageNotConfigured'),
            });
            continue;
          }

          // 生成唯一文件名（保留原始扩展名）
          const timestamp = Date.now();
          const randomStr = Math.random().toString(36).substring(2, 8);
          const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const uniqueFileName = `${timestamp}_${randomStr}_${sanitizedName}`;
          
          filePath = uniqueFileName;
          absolutePath = path.join(basePath, uniqueFileName);

          // 确保目录存在
          await fs.mkdir(path.dirname(absolutePath), { recursive: true });

          // 保存文件
          const buffer = Buffer.from(await file.arrayBuffer());
          await fs.writeFile(absolutePath, buffer);
        } else if (storage.type === 's3') {
          // S3 存储 - 暂时返回错误，需要实现 S3 上传逻辑
          results.push({
            success: false,
            fileName: file.name,
            error: t('s3UploadNotImplemented'),
          });
          continue;
        } else {
          results.push({
            success: false,
            fileName: file.name,
            error: t('unsupportedStorageType'),
          });
          continue;
        }

        // 6. 创建数据库记录
        const [savedFile] = await db
          .insert(files)
          .values({
            title: file.name,
            path: filePath,
            sourceType: storage.type,
            size: file.size,
            mimeType,
            mtime: new Date(),
            userStorageId: storageId,
            mediaType,
            blurHash: null,
            isPublished: false,
            updatedAt: new Date(),
          })
          .returning({ id: files.id });

        if (!savedFile?.id) {
          // 如果数据库插入失败，删除已保存的文件
          try {
            await fs.unlink(absolutePath);
          } catch (cleanupError) {
            console.error('Failed to cleanup file:', cleanupError);
          }
          results.push({
            success: false,
            fileName: file.name,
            error: t('databaseError'),
          });
          continue;
        }

        // 7. 异步提取元数据（不阻塞响应）
        extractMetadataAsync(savedFile.id, absolutePath, mediaType, storageId).catch((error) => {
          console.error(`Failed to extract metadata for file ${savedFile.id}:`, error);
        });

        results.push({
          success: true,
          fileName: file.name,
          fileId: savedFile.id,
        });
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
        results.push({
          success: false,
          fileName: file.name,
          error: t('processingError'),
        });
      }
    }

    // 8. 返回结果
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    return NextResponse.json({
      success: failureCount === 0,
      message: t('uploadComplete', { success: successCount, failed: failureCount }),
      results,
    });
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 异步提取元数据
async function extractMetadataAsync(
  fileId: number,
  absolutePath: string,
  mediaType: string,
  storageId: number
) {
  const thumbRoot = getStorageCacheRoot(storageId);
  const thumbPath = path.join(thumbRoot, `${fileId}.webp`);

  // 确保缩略图目录存在
  await fs.mkdir(thumbRoot, { recursive: true });

  let fileBlurHash: string | null = null;

  if (mediaType === 'video') {
    // 删除可能存在的照片元数据
    await db.delete(photoMetadata).where(eq(photoMetadata.fileId, fileId));

    // 提取视频信息
    const videoInfo = await probeVideoMetadata(absolutePath);
    const poster = await generateVideoPoster(
      absolutePath,
      thumbPath,
      videoInfo?.duration ?? null
    );

    fileBlurHash = poster?.blurHash ?? null;

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
  } else {
    // 删除可能存在的视频元数据
    await db.delete(videoMetadata).where(eq(videoMetadata.fileId, fileId));

    // 提取照片元数据
    const metadata = await readPhotoMetadata(absolutePath);
    const thumbnail = await generateImageThumbnail(absolutePath, thumbPath);
    fileBlurHash = thumbnail?.blurHash ?? null;

    // 检测实况照片
    const motionInfo = await detectMotionPhotoInfo(absolutePath);
    const liveType =
      motionInfo?.type === 'google'
        ? 'google'
        : motionInfo?.type === 'apple'
          ? 'apple'
          : 'none';

    await db
      .insert(photoMetadata)
      .values({
        fileId,
        description: metadata.description ?? null,
        camera: metadata.camera ?? null,
        maker: metadata.maker ?? null,
        lens: metadata.lens ?? null,
        dateShot: metadata.dateShot ?? null,
        exposure: metadata.exposure ?? null,
        aperture: metadata.aperture ?? null,
        iso: metadata.iso ?? null,
        focalLength: metadata.focalLength ?? null,
        whiteBalance: metadata.whiteBalance ?? null,
        gpsLatitude: metadata.gpsLatitude ?? null,
        gpsLongitude: metadata.gpsLongitude ?? null,
        resolutionWidth: thumbnail?.width ?? null,
        resolutionHeight: thumbnail?.height ?? null,
        liveType,
        pairedPath: motionInfo?.videoPath ?? null,
      })
      .onConflictDoUpdate({
        target: [photoMetadata.fileId],
        set: {
          description: metadata.description ?? null,
          camera: metadata.camera ?? null,
          maker: metadata.maker ?? null,
          lens: metadata.lens ?? null,
          dateShot: metadata.dateShot ?? null,
          exposure: metadata.exposure ?? null,
          aperture: metadata.aperture ?? null,
          iso: metadata.iso ?? null,
          focalLength: metadata.focalLength ?? null,
          whiteBalance: metadata.whiteBalance ?? null,
          gpsLatitude: metadata.gpsLatitude ?? null,
          gpsLongitude: metadata.gpsLongitude ?? null,
          resolutionWidth: thumbnail?.width ?? null,
          resolutionHeight: thumbnail?.height ?? null,
          liveType,
          pairedPath: motionInfo?.videoPath ?? null,
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
