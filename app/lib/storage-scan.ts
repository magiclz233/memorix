import { eq, sql, inArray, and } from 'drizzle-orm';
import { promises as fs, createWriteStream, createReadStream } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { db } from './drizzle';
import { files, photoMetadata, videoMetadata } from './schema';
import { readPhotoMetadata, scanMediaFiles, type ScanWalkEvent } from './storage';
import { detectAnimatedImage, generateImageThumbnail } from './image-preview';
import { generateVideoPoster, probeVideoMetadata } from './video';
import { getTranslations } from 'next-intl/server';
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import {
  resolveS3Client,
  normalizeS3Prefix,
  isNoSuchKeyError,
  type S3Config,
} from './s3-helper';

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
};

type S3StorageConfig = S3Config;

type S3StorageScanOptions = {
  storageId: number;
  config: S3StorageConfig;
  mode?: StorageScanMode;
  onLog?: (entry: StorageScanLog) => void;
  onProgress?: (progress: StorageScanProgress) => void;
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

const uploadS3File = async (
  client: S3Client,
  bucket: string,
  key: string,
  filePath: string,
  contentType?: string,
) => {
  const stream = createReadStream(filePath);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: stream,
      ContentType: contentType,
    }),
  );
};

export async function runStorageScan({
  storageId,
  storageType,
  rootPath,
  mode = 'incremental',
  onLog,
  onProgress,
}: StorageScanOptions) {
  const t = await getTranslations('dashboard.scan');
  const log = (level: StorageScanLogLevel, message: string) => {
    onLog?.({ level, message });
  };

  let scannedImages = 0;
  let scannedVideos = 0;
  let scannedAnimated = 0;
  let scannedDirs = 0;
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
      log('warn', `${event.message ?? t('readFailed')}: ${event.path}`);
    }
  });

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
  const thumbRoot = path.join(rootPath, '.memorix', 'thumbs');
  await fs.mkdir(thumbRoot, { recursive: true });

  await db.transaction(async (tx) => {
    // 1. Get all file paths in DB for this storage
    const existingFiles = await tx
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
      .where(eq(files.userStorageId, storageId));
    
    const scannedPathSet = new Set(filteredFileList.map((f) => f.relativePath));
    const existingFileMap = new Map(existingFiles.map((file) => [file.path, file]));

    // 2. Find files to delete (in DB but not in scan)
    const filesToDelete = existingFiles.filter(
      (f) => !scannedPathSet.has(f.path),
    );
    const pathsToDelete = filesToDelete.map((f) => f.path);
    const idsToDelete = filesToDelete.map((f) => f.id);

    if (pathsToDelete.length > 0) {
      // Batch delete
      const batchSize = 1000;
      for (let i = 0; i < pathsToDelete.length; i += batchSize) {
        const batch = pathsToDelete.slice(i, i + batchSize);
        const idBatch = idsToDelete.slice(i, i + batchSize);
        if (idBatch.length > 0) {
          await tx
            .delete(photoMetadata)
            .where(inArray(photoMetadata.fileId, idBatch));
          await tx
            .delete(videoMetadata)
            .where(inArray(videoMetadata.fileId, idBatch));
        }
        await tx
          .delete(files)
          .where(and(eq(files.userStorageId, storageId), inArray(files.path, batch)));
      }
      log('info', t('clearedMissing', { count: pathsToDelete.length }));
    }

    // 3. Update or insert files
    for (const file of filteredFileList) {
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
        processed += 1;
        if (processed % 50 === 0 || processed === filteredFileList.length) {
          onProgress?.({ stage: 'save', processed, total: filteredFileList.length });
          log('info', t('processed', { processed, total: filteredFileList.length }));
        }
        continue;
      }

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

    await tx
      .update(files)
      .set({
        url: sql<string>`CASE WHEN ${files.mediaType} = 'video' THEN '/api/media/stream/' || ${files.id} ELSE '/api/local-files/' || ${files.id} END`,
        thumbUrl: sql<string>`'/api/media/thumb/' || ${files.id}`,
      })
      .where(eq(files.userStorageId, storageId));
  });

  return { processed, total: filteredFileList.length };
}

export async function runS3StorageScan({
  storageId,
  config,
  mode = 'incremental',
  onLog,
  onProgress,
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
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'memorix-s3-'));
  const thumbPrefix = prefix ? `${prefix}.memorix/thumbs/` : '.memorix/thumbs/';

  try {
    await db.transaction(async (tx) => {
      const existingFiles = await tx
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
        .where(eq(files.userStorageId, storageId));

      const scannedPathSet = new Set(filteredFileList.map((f) => f.key));
      const existingFileMap = new Map(existingFiles.map((file) => [file.path, file]));

      const filesToDelete = existingFiles.filter(
        (f) => !scannedPathSet.has(f.path),
      );
      const pathsToDelete = filesToDelete.map((f) => f.path);
      const idsToDelete = filesToDelete.map((f) => f.id);

      if (pathsToDelete.length > 0) {
        const batchSize = 1000;
        for (let i = 0; i < pathsToDelete.length; i += batchSize) {
          const batch = pathsToDelete.slice(i, i + batchSize);
          const idBatch = idsToDelete.slice(i, i + batchSize);
          if (idBatch.length > 0) {
            await tx
              .delete(photoMetadata)
              .where(inArray(photoMetadata.fileId, idBatch));
            await tx
              .delete(videoMetadata)
              .where(inArray(videoMetadata.fileId, idBatch));
          }
          await tx
            .delete(files)
            .where(and(eq(files.userStorageId, storageId), inArray(files.path, batch)));
        }
        log('info', t('clearedMissing', { count: pathsToDelete.length }));
      }

      const advance = () => {
        processed += 1;
        if (processed % 50 === 0 || processed === filteredFileList.length) {
          onProgress?.({ stage: 'save', processed, total: filteredFileList.length });
          log('info', t('processed', { processed, total: filteredFileList.length }));
        }
      };

      for (const file of filteredFileList) {
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
          advance();
          continue;
        }

        const [saved] = await tx
          .insert(files)
          .values({
            title: file.title,
            path: file.key,
            sourceType: 's3',
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
              sourceType: 's3',
              mediaType: resolvedMediaType,
              updatedAt: new Date(),
            },
          })
          .returning({ id: files.id });

        if (saved?.id) {
          const tempPath = path.join(
            tempRoot,
            `${crypto.randomUUID()}${path.extname(file.key)}`,
          );
          const thumbTemp = path.join(tempRoot, `${saved.id}.webp`);
          const thumbKey = `${thumbPrefix}${saved.id}.webp`;
          let fileBlurHash: string | null = null;

          try {
            await downloadS3Object(client, bucket, file.key, tempPath);

            if (resolvedMediaType === 'video') {
              await tx
                .delete(photoMetadata)
                .where(eq(photoMetadata.fileId, saved.id));

              const videoInfo = await probeVideoMetadata(tempPath);
              const poster = await generateVideoPoster(
                tempPath,
                thumbTemp,
                videoInfo?.duration ?? null,
              );

              fileBlurHash = poster?.blurHash ?? null;

              if (poster) {
                await uploadS3File(client, bucket, thumbKey, thumbTemp, 'image/webp');
              }

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
              const thumbnail = await generateImageThumbnail(tempPath, thumbTemp);
              fileBlurHash = thumbnail?.blurHash ?? null;

              if (thumbnail) {
                await uploadS3File(client, bucket, thumbKey, thumbTemp, 'image/webp');
              }

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
            log('warn', `${detail}, skip: s3://${bucket}/${file.key}`);
            await tx.delete(photoMetadata).where(eq(photoMetadata.fileId, saved.id));
            await tx.delete(videoMetadata).where(eq(videoMetadata.fileId, saved.id));
            await tx.delete(files).where(eq(files.id, saved.id));
            advance();
            continue;
          } finally {
            await safeRm(tempPath, { force: true });
            await safeRm(thumbTemp, { force: true });
          }
        }

        advance();
      }

      await tx
        .update(files)
        .set({
          url: sql<string>`CASE WHEN ${files.mediaType} = 'video' THEN '/api/media/stream/' || ${files.id} ELSE '/api/local-files/' || ${files.id} END`,
          thumbUrl: sql<string>`'/api/media/thumb/' || ${files.id}`,
        })
        .where(eq(files.userStorageId, storageId));
    });
  } finally {
    await safeRm(tempRoot, { recursive: true, force: true });
  }

  return { processed, total: filteredFileList.length };
}
