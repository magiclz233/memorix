import { eq, sql, inArray, and, isNull } from 'drizzle-orm';
import { promises as fs, createWriteStream } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { db } from './drizzle';
import { files, photoMetadata, videoMetadata } from './schema';
import {
  getStorageCacheRoot,
  readPhotoMetadata,
  scanMediaFiles,
  ScanCancelledError,
  type ScanWalkEvent,
} from './storage';
import { detectAnimatedImage, generateImageThumbnail } from './image-preview';
import { generateVideoPoster, probeVideoMetadata } from './video';
import { getTranslations } from 'next-intl/server';
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import {
  resolveS3Client,
  normalizeS3Prefix,
  isNoSuchKeyError,
  type S3Config,
} from './s3-helper';
import { isSuspiciousDeletion } from './scan-safety';
import { streamFileSha256 } from './hash-file';

export type StorageScanLogLevel = 'info' | 'warn' | 'error';

export type StorageScanLog = {
  level: StorageScanLogLevel;
  message: string;
};

export type StorageScanProgress = {
  stage: 'save';
  processed: number;
  total: number;
};

export type StorageScanMode = 'incremental' | 'full';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const safeRm = async (targetPath: string, options: Parameters<typeof fs.rm>[1]) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await fs.rm(targetPath, options);
      return;
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? (error as { code?: unknown }).code
          : undefined;
      if (
        (code === 'EBUSY' || code === 'EPERM' || code === 'EACCES') &&
        attempt < 4
      ) {
        await delay(50 * (attempt + 1));
        continue;
      }
      return;
    }
  }
};

const IMAGE_MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.avif': 'image/avif',
};

const VIDEO_MIME_BY_EXT: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.m2ts': 'video/mp2t',
  '.ts': 'video/mp2t',
};

const getImageMimeType = (fileName: string) => {
  const ext = path.extname(fileName).toLowerCase();
  return IMAGE_MIME_BY_EXT[ext];
};

const getVideoMimeType = (fileName: string) => {
  const ext = path.extname(fileName).toLowerCase();
  return VIDEO_MIME_BY_EXT[ext];
};

type StorageScanOptions = {
  storageId: number;
  storageType: 'local' | 'nas';
  rootPath: string;
  mode?: StorageScanMode;
  onLog?: (entry: StorageScanLog) => void;
  onProgress?: (progress: StorageScanProgress) => void;
  /** 协作式取消：批间轮询，返回 true 时尽快中止（P1-6 任务队列） */
  shouldCancel?: () => boolean | Promise<boolean>;
  /** 单文件失败回调（扫描继续，不中断整场扫描） */
  onError?: (entry: { path: string; message: string }) => void;
};

// ScanCancelledError 定义在 ./storage（storage.ts 的遍历器直接抛出），
// 这里重导出保持对外 API 兼容。
export { ScanCancelledError } from './storage';

export type ScanRunResult = {
  processed: number;
  total: number;
  /** 是否被取消中止（未跑完全量） */
  cancelled: boolean;
  /** 处理失败被跳过的文件数 */
  failed: number;
};

type S3StorageConfig = S3Config;

type S3StorageScanOptions = {
  storageId: number;
  storageType?: 's3' | 'qiniu';
  config: S3StorageConfig;
  mode?: StorageScanMode;
  onLog?: (entry: StorageScanLog) => void;
  onProgress?: (progress: StorageScanProgress) => void;
  /** 协作式取消：批间轮询，返回 true 时尽快中止（P1-6 任务队列） */
  shouldCancel?: () => boolean | Promise<boolean>;
  /** 单文件失败回调（扫描继续，不中断整场扫描） */
  onError?: (entry: { path: string; message: string }) => void;
};

type S3MediaFileInfo = {
  key: string;
  title: string;
  size: number;
  mtime: Date;
  mimeType: string;
  mediaType: 'image' | 'video' | 'animated';
};

const resolveS3ClientInternal = (config: S3StorageConfig) => {
  return resolveS3Client(config);
};

const isReservedS3Key = (key: string) => {
  if (!key) return true;
  if (key.endsWith('/')) return true;
  return key.startsWith('.memorix/') || key.includes('/.memorix/');
};

const listS3MediaFiles = async (
  client: S3Client,
  bucket: string,
  prefix: string,
  onLog?: (entry: StorageScanLog) => void,
  t?: Awaited<ReturnType<typeof getTranslations>>,
) => {
  let continuationToken: string | undefined;
  const results: S3MediaFileInfo[] = [];
  let scannedImages = 0;
  let scannedVideos = 0;
  let scannedAnimated = 0;
  const log = (level: StorageScanLogLevel, message: string) => {
    onLog?.({ level, message });
  };

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix || undefined,
        ContinuationToken: continuationToken,
      }),
    );
    for (const item of response.Contents ?? []) {
      const key = item.Key;
      if (!key || isReservedS3Key(key)) continue;
      const imageMimeType = getImageMimeType(key);
      const videoMimeType = getVideoMimeType(key);
      if (!imageMimeType && !videoMimeType) continue;
      const lowerKey = key.toLowerCase();
      const mediaType = videoMimeType
        ? 'video'
        : lowerKey.endsWith('.gif')
          ? 'animated'
          : 'image';
      if (mediaType === 'video') {
        scannedVideos += 1;
        if (scannedVideos % 50 === 0) {
          log('info', t ? t('foundVideos', { count: scannedVideos }) : `Found videos: ${scannedVideos}`);
        }
      } else if (mediaType === 'animated') {
        scannedAnimated += 1;
        if (scannedAnimated % 50 === 0) {
          log('info', t ? t('foundAnimated', { count: scannedAnimated }) : `Found animated: ${scannedAnimated}`);
        }
      } else {
        scannedImages += 1;
        if (scannedImages % 100 === 0) {
          log('info', t ? t('foundImages', { count: scannedImages }) : `Found images: ${scannedImages}`);
        }
      }

      results.push({
        key,
        title: path.basename(key),
        size: item.Size ?? 0,
        mtime: item.LastModified ?? new Date(),
        mimeType: videoMimeType ?? imageMimeType ?? 'application/octet-stream',
        mediaType,
      });
    }
    continuationToken = response.IsTruncated
      ? response.NextContinuationToken ?? undefined
      : undefined;
  } while (continuationToken);

  return results;
};

const s3BodyToReadable = (body: unknown) => {
  if (!body) return null;
  if (body instanceof Readable) return body;
  return Readable.from(body as AsyncIterable<Uint8Array>);
};

const downloadS3Object = async (
  client: S3Client,
  bucket: string,
  key: string,
  targetPath: string,
) => {
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
  const readable = s3BodyToReadable(response.Body);
  if (!readable) {
    throw new Error('S3 object body empty');
  }
  await pipeline(readable, createWriteStream(targetPath));
};

/**
 * 处理单个文件的元数据提取（供上传流程使用）
 */
export async function processSingleFileMetadata(
  fileId: number,
  absolutePath: string,
  fileName: string,
  mimeType: string,
  storageId: number,
): Promise<void> {
  const thumbRoot = getStorageCacheRoot(storageId);
  await fs.mkdir(thumbRoot, { recursive: true });

  const thumbPath = path.join(thumbRoot, `${fileId}.webp`);
  let fileBlurHash: string | null = null;

  // 判断媒体类型
  const ext = path.extname(fileName).toLowerCase();
  const videoMimeType = getVideoMimeType(fileName);
  let mediaType: 'image' | 'video' | 'animated' = videoMimeType
    ? 'video'
    : ext === '.gif'
      ? 'animated'
      : 'image';

  // 检测 webp 是否为动图
  if (mimeType === 'image/webp' && mediaType === 'image') {
    const isAnimated = await detectAnimatedImage(absolutePath);
    if (isAnimated) {
      mediaType = 'animated';
    }
  }

  // 更新媒体类型
  await db.update(files).set({ mediaType }).where(eq(files.id, fileId));

  if (mediaType === 'video') {
    // 删除可能存在的照片元数据
    await db.delete(photoMetadata).where(eq(photoMetadata.fileId, fileId));

    // 提取视频元数据
    const videoInfo = await probeVideoMetadata(absolutePath);
    const poster = await generateVideoPoster(
      absolutePath,
      thumbPath,
      videoInfo?.duration ?? null,
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
          codecVideoProfile: videoInfo.codecVideoProfile ?? null,
          pixelFormat: videoInfo.pixelFormat ?? null,
          colorSpace: videoInfo.colorSpace ?? null,
          colorRange: videoInfo.colorRange ?? null,
          colorPrimaries: videoInfo.colorPrimaries ?? null,
          colorTransfer: videoInfo.colorTransfer ?? null,
          bitDepth: videoInfo.bitDepth ?? null,
          codecAudio: videoInfo.codecAudio ?? null,
          audioChannels: videoInfo.audioChannels ?? null,
          audioSampleRate: videoInfo.audioSampleRate ?? null,
          audioBitrate: videoInfo.audioBitrate ?? null,
          hasAudio: videoInfo.hasAudio ?? false,
          rotation: videoInfo.rotation ?? null,
          containerFormat: videoInfo.containerFormat ?? null,
          containerLong: videoInfo.containerLong ?? null,
          posterTime: poster?.posterTime ?? null,
          raw: videoInfo.raw ?? null,
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
            codecVideoProfile: videoInfo.codecVideoProfile ?? null,
            pixelFormat: videoInfo.pixelFormat ?? null,
            colorSpace: videoInfo.colorSpace ?? null,
            colorRange: videoInfo.colorRange ?? null,
            colorPrimaries: videoInfo.colorPrimaries ?? null,
            colorTransfer: videoInfo.colorTransfer ?? null,
            bitDepth: videoInfo.bitDepth ?? null,
            codecAudio: videoInfo.codecAudio ?? null,
            audioChannels: videoInfo.audioChannels ?? null,
            audioSampleRate: videoInfo.audioSampleRate ?? null,
            audioBitrate: videoInfo.audioBitrate ?? null,
            hasAudio: videoInfo.hasAudio ?? false,
            rotation: videoInfo.rotation ?? null,
            containerFormat: videoInfo.containerFormat ?? null,
            containerLong: videoInfo.containerLong ?? null,
            posterTime: poster?.posterTime ?? null,
            raw: videoInfo.raw ?? null,
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

    if (metadata) {
      const hasEmbedded =
        metadata.motionPhoto &&
        typeof metadata.videoOffset === 'number' &&
        metadata.videoOffset > 0;
      const liveType = hasEmbedded ? 'embedded' : 'none';

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
          flash: metadata.flash ?? null,
          orientation: metadata.orientation ?? null,
          exposureProgram: metadata.exposureProgram ?? null,
          gpsLatitude: metadata.gpsLatitude ?? null,
          gpsLongitude: metadata.gpsLongitude ?? null,
          resolutionWidth: metadata.resolutionWidth ?? null,
          resolutionHeight: metadata.resolutionHeight ?? null,
          whiteBalance: metadata.whiteBalance ?? null,
          liveType,
          videoOffset: hasEmbedded ? metadata.videoOffset ?? null : null,
          pairedPath: null,
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
            flash: metadata.flash ?? null,
            orientation: metadata.orientation ?? null,
            exposureProgram: metadata.exposureProgram ?? null,
            gpsLatitude: metadata.gpsLatitude ?? null,
            gpsLongitude: metadata.gpsLongitude ?? null,
            resolutionWidth: metadata.resolutionWidth ?? null,
            resolutionHeight: metadata.resolutionHeight ?? null,
            whiteBalance: metadata.whiteBalance ?? null,
            liveType,
            videoOffset: hasEmbedded ? metadata.videoOffset ?? null : null,
            pairedPath: null,
          },
        });
    }
  }

  // 更新 blurHash
  if (fileBlurHash !== null) {
    await db
      .update(files)
      .set({ blurHash: fileBlurHash, updatedAt: new Date() })
      .where(eq(files.id, fileId));
  }
}

export async function runStorageScan({
  storageId,
  storageType,
  rootPath,
  mode = 'incremental',
  onLog,
  onProgress,
  shouldCancel,
  onError,
}: StorageScanOptions) {
  const t = await getTranslations('dashboard.scan');
  const log = (level: StorageScanLogLevel, message: string) => {
    onLog?.({ level, message });
  };

  let scannedImages = 0;
  let scannedVideos = 0;
  let scannedAnimated = 0;
  let scannedDirs = 0;
  let scanHadReadErrors = false;
  const livePhotoImageExts = new Set(['.heic', '.heif', '.jpg', '.jpeg']);

  const fileList = await scanMediaFiles(rootPath, (event: ScanWalkEvent) => {
    if (event.kind === 'dir') {
      scannedDirs += 1;
      if (scannedDirs % 100 === 0) {
        log('info', t('scannedDirs', { count: scannedDirs }));
      }
      return;
    }
    if (event.kind === 'file') {
      if (event.mediaType === 'video') {
        scannedVideos += 1;
        if (scannedVideos % 50 === 0) {
          log('info', t('foundVideos', { count: scannedVideos }));
        }
      } else if (event.mediaType === 'animated') {
        scannedAnimated += 1;
        if (scannedAnimated % 50 === 0) {
          log('info', t('foundAnimated', { count: scannedAnimated }));
        }
      } else {
        scannedImages += 1;
        if (scannedImages % 100 === 0) {
          log('info', t('foundImages', { count: scannedImages }));
        }
      }
      return;
    }
    if (event.kind === 'error') {
      scanHadReadErrors = true;
      log('warn', `${event.message ?? t('readFailed')}: ${event.path}`);
    }
  }, () => shouldCancel?.() ?? false);

  log('info', t('complete', { count: fileList.length }));

  const buildPairKey = (relativePath: string) => {
    const parsed = path.parse(relativePath);
    return path.join(parsed.dir, parsed.name).toLowerCase();
  };

  const liveVideoByKey = new Map<string, string>();
  for (const file of fileList) {
    const ext = path.extname(file.relativePath).toLowerCase();
    if (file.mediaType === 'video' && ext === '.mov') {
      liveVideoByKey.set(buildPairKey(file.relativePath), file.relativePath);
    }
  }

  const pairedVideoByImage = new Map<string, string>();
  const pairedVideoPaths = new Set<string>();
  for (const file of fileList) {
    if (file.mediaType === 'video') continue;
    const ext = path.extname(file.relativePath).toLowerCase();
    if (!livePhotoImageExts.has(ext)) continue;
    const pairedPath = liveVideoByKey.get(buildPairKey(file.relativePath));
    if (pairedPath) {
      pairedVideoByImage.set(file.relativePath, pairedPath);
      pairedVideoPaths.add(pairedPath);
    }
  }

  const filteredFileList = fileList.filter(
    (file) => !pairedVideoPaths.has(file.relativePath),
  );

  let processed = 0;
  let failedCount = 0;
  const thumbRoot = getStorageCacheRoot(storageId);
  await fs.mkdir(thumbRoot, { recursive: true });

  // 分批处理：每批一个短事务。
  // 每批处理里会对每个文件跑 ffprobe/sharp（generateVideoPoster / generateImageThumbnail），
  // 这些都是秒级 CPU/IO 密集操作。批大小 100 会让单个事务持续数十秒、长期占用连接池，
  // 且任一文件失败会回滚整批。降到 1 = 每文件一个短事务，彻底消除长事务。
  // 代价是事务数量增加，但 Postgres 短事务开销远低于长事务持有连接的风险。
  const BATCH_SIZE = 1;

  // 1. 先获取现有文件列表（不在事务中）
  const existingFiles = await db
    .select({
      id: files.id,
      path: files.path,
      size: files.size,
      mtime: files.mtime,
      mimeType: files.mimeType,
      mediaType: files.mediaType,
      fileHash: files.fileHash,
      liveType: photoMetadata.liveType,
      pairedPath: photoMetadata.pairedPath,
    })
    .from(files)
    .leftJoin(photoMetadata, eq(files.id, photoMetadata.fileId))
    .where(and(eq(files.userStorageId, storageId), isNull(files.deletedAt)));

  const scannedPathSet = new Set(filteredFileList.map((f) => f.relativePath));
  const existingFileMap = new Map(existingFiles.map((file) => [file.path, file]));

  // 取消检查点：进入写库阶段前（遍历阶段已由 scanMediaFiles 内部检查）
  if (await shouldCancel?.()) {
    throw new ScanCancelledError();
  }

  // 2. 删除不存在的文件（软删除 + 安全网）
  //     NAS 子目录临时断连 / 权限错误会让 scanMediaFiles 跳过该目录，
  //     若直接把这些"没扫到"的记录物理删除，会造成不可逆的数据丢失。
  const filesToDelete = existingFiles.filter(
    (f) => !scannedPathSet.has(f.path),
  );
  const idsToDelete = filesToDelete.map((f) => f.id);
  const looksAbnormal = isSuspiciousDeletion(
    filteredFileList.length,
    existingFiles.length,
    filesToDelete.length,
  );

  if (looksAbnormal) {
    log(
      'error',
      t('scanSafetyAbort', { found: filteredFileList.length, existing: existingFiles.length }),
    );
  } else if (idsToDelete.length > 0 && scanHadReadErrors) {
    // 目录遍历出现读取错误时，未扫到的记录可能只是暂时不可达，本轮不做清理。
    log('warn', t('missingCleanupSkipped', { count: idsToDelete.length }));
  } else if (idsToDelete.length > 0) {
    const deleteBatchSize = 1000;
    const deletedAt = new Date();
    for (let i = 0; i < idsToDelete.length; i += deleteBatchSize) {
      const idBatch = idsToDelete.slice(i, i + deleteBatchSize);
      await db
        .update(files)
        .set({ deletedAt })
        .where(and(eq(files.userStorageId, storageId), inArray(files.id, idBatch)));
    }
    log('info', t('softDeletedMissing', { count: idsToDelete.length }));
  }

  // 3. 更新或插入文件（分批处理）
  for (let i = 0; i < filteredFileList.length; i += BATCH_SIZE) {
    // 取消检查点：每个批（BATCH_SIZE=1 即每文件）轮询一次
    if (await shouldCancel?.()) {
      throw new ScanCancelledError();
    }
    const batch = filteredFileList.slice(i, i + BATCH_SIZE);

    // 按批容错（BATCH_SIZE=1 即按文件）：单个文件的 ffprobe/sharp/EXIF 失败
    // 不拖垮整场扫描，记录失败并继续（P1-6：失败列表可见，支持重试）。
    // catch 必须在事务之外——语句一旦失败，事务已进入 aborted 状态。
    try {
    await db.transaction(async (tx) => {
      for (const file of batch) {
        const existing = existingFileMap.get(file.relativePath);
        const currentFileName = path.basename(file.relativePath);
        const existingFileName = existing ? path.basename(existing.path) : null;
        let resolvedMediaType = file.mediaType;
        const pairedPath = pairedVideoByImage.get(file.relativePath) ?? null;
        const expectsPaired = Boolean(pairedPath);

        if (file.mimeType === 'image/webp' && file.mediaType === 'image') {
          const isAnimated = await detectAnimatedImage(file.absolutePath);
          if (isAnimated) {
            resolvedMediaType = 'animated';
          }
        }
        const hasCurrentMtime = file.mtime instanceof Date;
        const hasExistingMtime = existing?.mtime instanceof Date;
        const pairedStateMatches =
          resolvedMediaType === 'video'
            ? true
            : expectsPaired
              ? existing?.liveType === 'paired' && existing?.pairedPath === pairedPath
              : existing?.liveType !== 'paired';
        const isSameFile =
          Boolean(existing) &&
          existing?.path === file.relativePath &&
          existingFileName === currentFileName &&
          existing?.mimeType === file.mimeType &&
          existing?.mediaType === resolvedMediaType &&
          pairedStateMatches &&
          typeof existing?.size === 'number' &&
          existing.size === file.size &&
          hasCurrentMtime &&
          hasExistingMtime &&
          existing?.mtime?.getTime() === file.mtime.getTime();

        if (mode === 'incremental' && isSameFile) {
          // 进度计数统一由事务回调末尾的 processed += 1 负责
          // （原先这里 +1、末尾又 +1，增量模式下未变更文件被双计数）
          if (processed % 50 === 0 || processed === filteredFileList.length) {
            onProgress?.({ stage: 'save', processed, total: filteredFileList.length });
            log('info', t('processed', { processed, total: filteredFileList.length }));
          }
          continue;
        }

        // P2-3 内容级去重：新文件 / 变更文件 / full 重扫补齐 SHA-256（流式，内存恒定）
        const fileHash = await streamFileSha256(file.absolutePath);

        const [saved] = await tx
          .insert(files)
          .values({
            title: file.title,
            path: file.relativePath,
            sourceType: storageType,
            size: file.size,
            mimeType: file.mimeType,
            mtime: file.mtime,
            userStorageId: storageId,
            mediaType: resolvedMediaType,
            fileHash,
            blurHash: null,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [files.userStorageId, files.path],
            set: {
              title: file.title,
              size: file.size,
              mimeType: file.mimeType,
              mtime: file.mtime,
              sourceType: storageType,
              mediaType: resolvedMediaType,
              // 哈希失败（读取异常）时保留旧值，不覆盖为 null
              ...(fileHash ? { fileHash } : {}),
              updatedAt: new Date(),
              // 文件重新出现时从软删除中恢复
              deletedAt: null,
            },
          })
          .returning({ id: files.id });

        if (saved?.id) {
          const thumbPath = path.join(thumbRoot, `${saved.id}.webp`);
          let fileBlurHash: string | null = null;

          if (resolvedMediaType === 'video') {
            await tx
              .delete(photoMetadata)
              .where(eq(photoMetadata.fileId, saved.id));

            const videoInfo = await probeVideoMetadata(file.absolutePath);
            const poster = await generateVideoPoster(
              file.absolutePath,
              thumbPath,
              videoInfo?.duration ?? null,
            );

            fileBlurHash = poster?.blurHash ?? null;

            if (videoInfo) {
            await tx
              .insert(videoMetadata)
              .values({
                fileId: saved.id,
                duration: videoInfo.duration ?? null,
                width: videoInfo.width ?? null,
                height: videoInfo.height ?? null,
                bitrate: videoInfo.bitrate ?? null,
                fps: videoInfo.fps ?? null,
                frameCount: videoInfo.frameCount ?? null,
                codecVideo: videoInfo.codecVideo ?? null,
                codecVideoProfile: videoInfo.codecVideoProfile ?? null,
                pixelFormat: videoInfo.pixelFormat ?? null,
                colorSpace: videoInfo.colorSpace ?? null,
                colorRange: videoInfo.colorRange ?? null,
                colorPrimaries: videoInfo.colorPrimaries ?? null,
                colorTransfer: videoInfo.colorTransfer ?? null,
                bitDepth: videoInfo.bitDepth ?? null,
                codecAudio: videoInfo.codecAudio ?? null,
                audioChannels: videoInfo.audioChannels ?? null,
                audioSampleRate: videoInfo.audioSampleRate ?? null,
                audioBitrate: videoInfo.audioBitrate ?? null,
                hasAudio: videoInfo.hasAudio ?? false,
                rotation: videoInfo.rotation ?? null,
                containerFormat: videoInfo.containerFormat ?? null,
                containerLong: videoInfo.containerLong ?? null,
                posterTime: poster?.posterTime ?? null,
                raw: videoInfo.raw ?? null,
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
                  codecVideoProfile: videoInfo.codecVideoProfile ?? null,
                  pixelFormat: videoInfo.pixelFormat ?? null,
                  colorSpace: videoInfo.colorSpace ?? null,
                  colorRange: videoInfo.colorRange ?? null,
                  colorPrimaries: videoInfo.colorPrimaries ?? null,
                  colorTransfer: videoInfo.colorTransfer ?? null,
                  bitDepth: videoInfo.bitDepth ?? null,
                  codecAudio: videoInfo.codecAudio ?? null,
                  audioChannels: videoInfo.audioChannels ?? null,
                  audioSampleRate: videoInfo.audioSampleRate ?? null,
                  audioBitrate: videoInfo.audioBitrate ?? null,
                  hasAudio: videoInfo.hasAudio ?? false,
                  rotation: videoInfo.rotation ?? null,
                  containerFormat: videoInfo.containerFormat ?? null,
                  containerLong: videoInfo.containerLong ?? null,
                  posterTime: poster?.posterTime ?? null,
                  raw: videoInfo.raw ?? null,
                },
              });
          }
        } else {
          await tx
            .delete(videoMetadata)
            .where(eq(videoMetadata.fileId, saved.id));

          const metadata = await readPhotoMetadata(file.absolutePath);
          const thumbnail = await generateImageThumbnail(
            file.absolutePath,
            thumbPath,
          );
          fileBlurHash = thumbnail?.blurHash ?? null;

          if (metadata) {
            const hasEmbedded =
              metadata.motionPhoto &&
              typeof metadata.videoOffset === 'number' &&
              metadata.videoOffset > 0;
            const liveType = hasEmbedded
              ? 'embedded'
              : pairedPath
                ? 'paired'
                : 'none';
            await tx
              .insert(photoMetadata)
              .values({
                fileId: saved.id,
                description: metadata.description ?? null,
                camera: metadata.camera ?? null,
                maker: metadata.maker ?? null,
                lens: metadata.lens ?? null,
                dateShot: metadata.dateShot ?? null,
                exposure: metadata.exposure ?? null,
                aperture: metadata.aperture ?? null,
                iso: metadata.iso ?? null,
                focalLength: metadata.focalLength ?? null,
                flash: metadata.flash ?? null,
                orientation: metadata.orientation ?? null,
                exposureProgram: metadata.exposureProgram ?? null,
                gpsLatitude: metadata.gpsLatitude ?? null,
                gpsLongitude: metadata.gpsLongitude ?? null,
                resolutionWidth: metadata.resolutionWidth ?? null,
                resolutionHeight: metadata.resolutionHeight ?? null,
                whiteBalance: metadata.whiteBalance ?? null,
                liveType,
                videoOffset: hasEmbedded ? metadata.videoOffset ?? null : null,
                pairedPath: liveType === 'paired' ? pairedPath : null,
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
                  flash: metadata.flash ?? null,
                  orientation: metadata.orientation ?? null,
                  exposureProgram: metadata.exposureProgram ?? null,
                  gpsLatitude: metadata.gpsLatitude ?? null,
                  gpsLongitude: metadata.gpsLongitude ?? null,
                  resolutionWidth: metadata.resolutionWidth ?? null,
                  resolutionHeight: metadata.resolutionHeight ?? null,
                  whiteBalance: metadata.whiteBalance ?? null,
                  liveType,
                  videoOffset: hasEmbedded ? metadata.videoOffset ?? null : null,
                  pairedPath: liveType === 'paired' ? pairedPath : null,
                },
              });
          }
        }

        if (fileBlurHash !== null) {
          await tx
            .update(files)
            .set({ blurHash: fileBlurHash, updatedAt: new Date() })
            .where(eq(files.id, saved.id));
        }
      }

      processed += 1;

      if (processed % 50 === 0 || processed === filteredFileList.length) {
        onProgress?.({ stage: 'save', processed, total: filteredFileList.length });
        log('info', t('processed', { processed, total: filteredFileList.length }));
      }
    }
  });
    } catch (batchError) {
      failedCount += 1;
      const failedPath = batch[0]?.relativePath ?? 'unknown';
      const message = batchError instanceof Error ? batchError.message : String(batchError);
      log('warn', `skip: ${failedPath} (${message})`);
      onError?.({ path: failedPath, message });
    }
  }

  // 4. 最后更新 URL（单独事务）
  await db
    .update(files)
    .set({
      url: sql<string>`CASE WHEN ${files.mediaType} = 'video' THEN '/api/media/stream/' || ${files.id} ELSE '/api/local-files/' || ${files.id} END`,
      thumbUrl: sql<string>`'/api/media/thumb/' || ${files.id}`,
    })
    .where(eq(files.userStorageId, storageId));

  return { processed, total: filteredFileList.length, cancelled: false, failed: failedCount };
}

export async function runS3StorageScan({
  storageId,
  storageType = 's3',
  config,
  mode = 'incremental',
  onLog,
  onProgress,
  shouldCancel,
  onError,
}: S3StorageScanOptions) {
  const t = await getTranslations('dashboard.scan');
  const log = (level: StorageScanLogLevel, message: string) => {
    onLog?.({ level, message });
  };

  const bucket = config.bucket?.trim();
  if (!bucket) {
    throw new Error('S3 bucket not configured');
  }

  const client = resolveS3ClientInternal(config);
  const prefix = normalizeS3Prefix(config.prefix);

  const fileList = await listS3MediaFiles(client, bucket, prefix, onLog, t);

  log('info', t('complete', { count: fileList.length }));

  const livePhotoImageExts = new Set(['.heic', '.heif', '.jpg', '.jpeg']);
  const buildPairKey = (relativePath: string) => {
    const parsed = path.posix.parse(relativePath);
    return path.posix.join(parsed.dir, parsed.name).toLowerCase();
  };

  const liveVideoByKey = new Map<string, string>();
  for (const file of fileList) {
    const ext = path.extname(file.key).toLowerCase();
    if (file.mediaType === 'video' && ext === '.mov') {
      liveVideoByKey.set(buildPairKey(file.key), file.key);
    }
  }

  const pairedVideoByImage = new Map<string, string>();
  const pairedVideoPaths = new Set<string>();
  for (const file of fileList) {
    if (file.mediaType === 'video') continue;
    const ext = path.extname(file.key).toLowerCase();
    if (!livePhotoImageExts.has(ext)) continue;
    const pairedPath = liveVideoByKey.get(buildPairKey(file.key));
    if (pairedPath) {
      pairedVideoByImage.set(file.key, pairedPath);
      pairedVideoPaths.add(pairedPath);
    }
  }

  const filteredFileList = fileList.filter(
    (file) => !pairedVideoPaths.has(file.key),
  );

  let processed = 0;
  let s3FailedCount = 0;
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'memorix-s3-'));
  const thumbRoot = getStorageCacheRoot(storageId);
  await fs.mkdir(thumbRoot, { recursive: true });

  try {
    // 同本地扫描：每个文件一个短事务，避免 ffprobe/sharp 长时间占用连接池。
    const BATCH_SIZE = 1;

    // 1. 先获取现有文件列表（不在事务中）
    const existingFiles = await db
      .select({
        id: files.id,
        path: files.path,
        size: files.size,
        mtime: files.mtime,
        mimeType: files.mimeType,
        mediaType: files.mediaType,
        liveType: photoMetadata.liveType,
        pairedPath: photoMetadata.pairedPath,
      })
    .from(files)
    .leftJoin(photoMetadata, eq(files.id, photoMetadata.fileId))
    .where(and(eq(files.userStorageId, storageId), isNull(files.deletedAt)));

    const scannedPathSet = new Set(filteredFileList.map((f) => f.key));
    const existingFileMap = new Map(existingFiles.map((file) => [file.path, file]));

    // 取消检查点：进入写库阶段前（P1-6）
    if (await shouldCancel?.()) {
      throw new ScanCancelledError();
    }

    // 2. 删除不存在的文件（软删除 + 安全网）
    const filesToDelete = existingFiles.filter(
      (f) => !scannedPathSet.has(f.path),
    );
    const idsToDelete = filesToDelete.map((f) => f.id);
    const looksAbnormal = isSuspiciousDeletion(
      filteredFileList.length,
      existingFiles.length,
      filesToDelete.length,
    );

    if (looksAbnormal) {
      log(
        'error',
        t('scanSafetyAbort', { found: filteredFileList.length, existing: existingFiles.length }),
      );
    } else if (idsToDelete.length > 0) {
      const deleteBatchSize = 1000;
      const deletedAt = new Date();
      for (let i = 0; i < idsToDelete.length; i += deleteBatchSize) {
        const idBatch = idsToDelete.slice(i, i + deleteBatchSize);
        await db
          .update(files)
          .set({ deletedAt })
          .where(and(eq(files.userStorageId, storageId), inArray(files.id, idBatch)));
      }
      log('info', t('softDeletedMissing', { count: idsToDelete.length }));
    }

    const advance = () => {
      processed += 1;
      if (processed % 50 === 0 || processed === filteredFileList.length) {
        onProgress?.({ stage: 'save', processed, total: filteredFileList.length });
        log('info', t('processed', { processed, total: filteredFileList.length }));
      }
    };

    // 3. 更新或插入文件（分批处理）
    for (let i = 0; i < filteredFileList.length; i += BATCH_SIZE) {
      // 取消检查点：每批轮询一次（P1-6）
      if (await shouldCancel?.()) {
        throw new ScanCancelledError();
      }
      const batch = filteredFileList.slice(i, i + BATCH_SIZE);

      await db.transaction(async (tx) => {
        for (const file of batch) {
          const existing = existingFileMap.get(file.key);
          const currentFileName = path.basename(file.key);
          const existingFileName = existing ? path.basename(existing.path) : null;
          let resolvedMediaType = file.mediaType;
          const pairedPath = pairedVideoByImage.get(file.key) ?? null;
          const expectsPaired = Boolean(pairedPath);

          if (file.mimeType === 'image/webp' && file.mediaType === 'image') {
            const tempPath = path.join(
              tempRoot,
              `${crypto.randomUUID()}${path.extname(file.key)}`,
            );
            try {
              await downloadS3Object(client, bucket, file.key, tempPath);
              const isAnimated = await detectAnimatedImage(tempPath);
              if (isAnimated) {
                resolvedMediaType = 'animated';
              }
            } catch (error) {
              const detail = isNoSuchKeyError(error)
                ? 'S3 object not found'
                : 'S3 download failed';
              log('warn', `${detail}, skip: s3://${bucket}/${file.key}`);
              advance();
              continue;
            } finally {
              await safeRm(tempPath, { force: true });
            }
          }

          const hasCurrentMtime = file.mtime instanceof Date;
          const hasExistingMtime = existing?.mtime instanceof Date;
        const pairedStateMatches =
          resolvedMediaType === 'video'
            ? true
            : expectsPaired
              ? existing?.liveType === 'paired' && existing?.pairedPath === pairedPath
              : existing?.liveType !== 'paired';
        const isSameFile =
          Boolean(existing) &&
          existing?.path === file.key &&
          existingFileName === currentFileName &&
          existing?.mimeType === file.mimeType &&
          existing?.mediaType === resolvedMediaType &&
          pairedStateMatches &&
          typeof existing?.size === 'number' &&
          existing.size === file.size &&
          hasCurrentMtime &&
          hasExistingMtime &&
          existing?.mtime?.getTime() === file.mtime.getTime();

        if (mode === 'incremental' && isSameFile) {
          // 计数统一由循环末尾的 advance() 负责（原先双计数）
          continue;
        }

        const [saved] = await tx
          .insert(files)
          .values({
            title: file.title,
            path: file.key,
            sourceType: storageType,
            size: file.size,
            mimeType: file.mimeType,
            mtime: file.mtime,
            userStorageId: storageId,
            mediaType: resolvedMediaType,
            blurHash: null,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [files.userStorageId, files.path],
            set: {
              title: file.title,
              size: file.size,
              mimeType: file.mimeType,
              mtime: file.mtime,
              sourceType: storageType,
              mediaType: resolvedMediaType,
              updatedAt: new Date(),
              // 文件重新出现时从软删除中恢复
              deletedAt: null,
            },
          })
          .returning({ id: files.id });

        if (saved?.id) {
          const tempPath = path.join(
            tempRoot,
            `${crypto.randomUUID()}${path.extname(file.key)}`,
          );
          const thumbPath = path.join(thumbRoot, `${saved.id}.webp`);
          let fileBlurHash: string | null = null;

          try {
            await downloadS3Object(client, bucket, file.key, tempPath);
            // P2-3：对象已下载到本地，顺路补齐内容哈希
            const downloadedFileHash = await streamFileSha256(tempPath);
            await tx
              .update(files)
              .set({ fileHash: downloadedFileHash, updatedAt: new Date() })
              .where(and(eq(files.id, saved.id), isNull(files.fileHash)));

            if (resolvedMediaType === 'video') {
              await tx
                .delete(photoMetadata)
                .where(eq(photoMetadata.fileId, saved.id));

              const videoInfo = await probeVideoMetadata(tempPath);
              const poster = await generateVideoPoster(
                tempPath,
                thumbPath,
                videoInfo?.duration ?? null,
              );

              fileBlurHash = poster?.blurHash ?? null;

              if (videoInfo) {
                await tx
                  .insert(videoMetadata)
                  .values({
                    fileId: saved.id,
                    duration: videoInfo.duration ?? null,
                    width: videoInfo.width ?? null,
                    height: videoInfo.height ?? null,
                    bitrate: videoInfo.bitrate ?? null,
                    fps: videoInfo.fps ?? null,
                    frameCount: videoInfo.frameCount ?? null,
                    codecVideo: videoInfo.codecVideo ?? null,
                    codecVideoProfile: videoInfo.codecVideoProfile ?? null,
                    pixelFormat: videoInfo.pixelFormat ?? null,
                    colorSpace: videoInfo.colorSpace ?? null,
                    colorRange: videoInfo.colorRange ?? null,
                    colorPrimaries: videoInfo.colorPrimaries ?? null,
                    colorTransfer: videoInfo.colorTransfer ?? null,
                    bitDepth: videoInfo.bitDepth ?? null,
                    codecAudio: videoInfo.codecAudio ?? null,
                    audioChannels: videoInfo.audioChannels ?? null,
                    audioSampleRate: videoInfo.audioSampleRate ?? null,
                    audioBitrate: videoInfo.audioBitrate ?? null,
                    hasAudio: videoInfo.hasAudio ?? false,
                    rotation: videoInfo.rotation ?? null,
                    containerFormat: videoInfo.containerFormat ?? null,
                    containerLong: videoInfo.containerLong ?? null,
                    posterTime: poster?.posterTime ?? null,
                    raw: videoInfo.raw ?? null,
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
                      codecVideoProfile: videoInfo.codecVideoProfile ?? null,
                      pixelFormat: videoInfo.pixelFormat ?? null,
                      colorSpace: videoInfo.colorSpace ?? null,
                      colorRange: videoInfo.colorRange ?? null,
                      colorPrimaries: videoInfo.colorPrimaries ?? null,
                      colorTransfer: videoInfo.colorTransfer ?? null,
                      bitDepth: videoInfo.bitDepth ?? null,
                      codecAudio: videoInfo.codecAudio ?? null,
                      audioChannels: videoInfo.audioChannels ?? null,
                      audioSampleRate: videoInfo.audioSampleRate ?? null,
                      audioBitrate: videoInfo.audioBitrate ?? null,
                      hasAudio: videoInfo.hasAudio ?? false,
                      rotation: videoInfo.rotation ?? null,
                      containerFormat: videoInfo.containerFormat ?? null,
                      containerLong: videoInfo.containerLong ?? null,
                      posterTime: poster?.posterTime ?? null,
                      raw: videoInfo.raw ?? null,
                    },
                  });
              }
            } else {
              await tx
                .delete(videoMetadata)
                .where(eq(videoMetadata.fileId, saved.id));

              const metadata = await readPhotoMetadata(tempPath);
              const thumbnail = await generateImageThumbnail(tempPath, thumbPath);
              fileBlurHash = thumbnail?.blurHash ?? null;

              if (metadata) {
                const hasEmbedded =
                  metadata.motionPhoto &&
                  typeof metadata.videoOffset === 'number' &&
                  metadata.videoOffset > 0;
                const liveType = hasEmbedded
                  ? 'embedded'
                  : pairedPath
                    ? 'paired'
                    : 'none';
                await tx
                  .insert(photoMetadata)
                  .values({
                    fileId: saved.id,
                    description: metadata.description ?? null,
                    camera: metadata.camera ?? null,
                    maker: metadata.maker ?? null,
                    lens: metadata.lens ?? null,
                    dateShot: metadata.dateShot ?? null,
                    exposure: metadata.exposure ?? null,
                    aperture: metadata.aperture ?? null,
                    iso: metadata.iso ?? null,
                    focalLength: metadata.focalLength ?? null,
                    flash: metadata.flash ?? null,
                    orientation: metadata.orientation ?? null,
                    exposureProgram: metadata.exposureProgram ?? null,
                    gpsLatitude: metadata.gpsLatitude ?? null,
                    gpsLongitude: metadata.gpsLongitude ?? null,
                    resolutionWidth: metadata.resolutionWidth ?? null,
                    resolutionHeight: metadata.resolutionHeight ?? null,
                    whiteBalance: metadata.whiteBalance ?? null,
                    liveType,
                    videoOffset: hasEmbedded ? metadata.videoOffset ?? null : null,
                    pairedPath: liveType === 'paired' ? pairedPath : null,
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
                      flash: metadata.flash ?? null,
                      orientation: metadata.orientation ?? null,
                      exposureProgram: metadata.exposureProgram ?? null,
                      gpsLatitude: metadata.gpsLatitude ?? null,
                      gpsLongitude: metadata.gpsLongitude ?? null,
                      resolutionWidth: metadata.resolutionWidth ?? null,
                      resolutionHeight: metadata.resolutionHeight ?? null,
                      whiteBalance: metadata.whiteBalance ?? null,
                      liveType,
                      videoOffset: hasEmbedded ? metadata.videoOffset ?? null : null,
                      pairedPath: liveType === 'paired' ? pairedPath : null,
                    },
                  });
              }
            }

            if (fileBlurHash !== null) {
              await tx
                .update(files)
                .set({ blurHash: fileBlurHash, updatedAt: new Date() })
                .where(eq(files.id, saved.id));
            }
          } catch (error) {
            const detail = isNoSuchKeyError(error)
              ? 'S3 object not found'
              : 'S3 processing failed';
            const failMessage =
              error instanceof Error ? `${detail}: ${error.message}` : detail;
            log('warn', `${detail}, skip: s3://${bucket}/${file.key}`);
            s3FailedCount += 1;
            onError?.({ path: file.key, message: failMessage });
            // 不物理删除：这条记录可能是刚刚从软删状态恢复的，一次临时 S3
            // 抖动（NoSuchKey / ffmpeg 异常）就抹掉它和元数据，正是要消除的
            // 不可逆数据丢失。改为软删，保留元数据与可恢复性；下次扫描对象
            // 回来时 onConflictDoUpdate 会清 deletedAt 自动恢复。
            await tx
              .update(files)
              .set({ deletedAt: new Date(), updatedAt: new Date() })
              .where(eq(files.id, saved.id));
            advance();
            continue;
          } finally {
            await safeRm(tempPath, { force: true });
          }
        }

        advance();
      }
    });
    }

    // 4. 最后更新 URL（单独事务）
    await db
      .update(files)
      .set({
        url: sql<string>`CASE WHEN ${files.mediaType} = 'video' THEN '/api/media/stream/' || ${files.id} ELSE '/api/local-files/' || ${files.id} END`,
        thumbUrl: sql<string>`'/api/media/thumb/' || ${files.id}`,
      })
      .where(eq(files.userStorageId, storageId));
  } finally {
    await safeRm(tempRoot, { recursive: true, force: true });
  }

  return { processed, total: filteredFileList.length, cancelled: false, failed: s3FailedCount };
}
