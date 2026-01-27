import { eq, sql, inArray, and } from 'drizzle-orm';
import { promises as fs } from 'fs';
import path from 'path';
import { db } from './drizzle';
import { files, photoMetadata } from './schema';
import { readPhotoMetadata, scanImageFiles, type ScanWalkEvent } from './storage';
import { getTranslations } from 'next-intl/server';
import sharp from 'sharp';
import { encode } from 'blurhash';

const LIVE_PHOTO_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.heic', '.heif']);
const LIVE_PHOTO_VIDEO_EXTENSIONS = ['.mov', '.MOV'];
const MAX_LIVE_PHOTO_VIDEO_BYTES = 12 * 1024 * 1024;

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

type StorageScanOptions = {
  storageId: number;
  storageType: 'local' | 'nas';
  rootPath: string;
  mode?: StorageScanMode;
  onLog?: (entry: StorageScanLog) => void;
  onProgress?: (progress: StorageScanProgress) => void;
};

async function generateBlurHash(path: string): Promise<string | null> {
  try {
    const { data, info } = await sharp(path)
      .raw()
      .ensureAlpha()
      .resize(32, 32, { fit: 'inside' })
      .toBuffer({ resolveWithObject: true });
    
    return encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4);
  } catch (error) {
    // console.error(`Failed to generate blurhash for ${path}:`, error);
    return null;
  }
}

async function findPairedLiveVideo(
  imagePath: string,
  imageMtime?: Date,
): Promise<string | null> {
  const parsed = path.parse(imagePath);
  const candidates = LIVE_PHOTO_VIDEO_EXTENSIONS.map((ext) =>
    path.join(parsed.dir, `${parsed.name}${ext}`),
  );

  let bestMatch: { path: string; diff: number } | null = null;

  for (const videoPath of candidates) {
    if (videoPath === imagePath) continue;
    try {
      const stat = await fs.stat(videoPath);
      if (!stat.isFile()) continue;
      if (stat.size > MAX_LIVE_PHOTO_VIDEO_BYTES) continue;
      const diff = imageMtime
        ? Math.abs(stat.mtime.getTime() - imageMtime.getTime())
        : 0;
      if (!bestMatch || diff < bestMatch.diff) {
        bestMatch = { path: videoPath, diff };
      }
    } catch {
      continue;
    }
  }

  return bestMatch?.path ?? null;
}

export async function runStorageScan({
  storageId,
  storageType,
  rootPath,
  mode = 'incremental',
  onLog,
  onProgress,
}: StorageScanOptions) {
  const t = await getTranslations('dashboard.storage.files.scan');
  const log = (level: StorageScanLogLevel, message: string) => {
    onLog?.({ level, message });
  };

  let scannedImages = 0;
  let scannedDirs = 0;

  const fileList = await scanImageFiles(rootPath, (event: ScanWalkEvent) => {
    if (event.kind === 'dir') {
      scannedDirs += 1;
      if (scannedDirs % 100 === 0) {
        log('info', t('scannedDirs', { count: scannedDirs }));
      }
      return;
    }
    if (event.kind === 'file') {
      scannedImages += 1;
      if (scannedImages % 100 === 0) {
        log('info', t('foundImages', { count: scannedImages }));
      }
      return;
    }
    if (event.kind === 'error') {
      log('warn', `${event.message ?? t('readFailed')}: ${event.path}`);
    }
  });

  log('info', t('complete', { count: fileList.length }));

  let processed = 0;

  await db.transaction(async (tx) => {
    // 1. Get all file paths in DB for this storage
    const existingFiles = await tx
      .select({
        path: files.path,
        size: files.size,
        mtime: files.mtime,
        mimeType: files.mimeType,
      })
      .from(files)
      .where(eq(files.userStorageId, storageId));
    
    const existingPathSet = new Set(existingFiles.map((f) => f.path));
    const scannedPathSet = new Set(fileList.map((f) => f.relativePath));
    const existingFileMap = new Map(existingFiles.map((file) => [file.path, file]));

    // 2. Find files to delete (in DB but not in scan)
    const pathsToDelete = existingFiles
      .filter((f) => !scannedPathSet.has(f.path))
      .map((f) => f.path);

    if (pathsToDelete.length > 0) {
      // Batch delete
      const batchSize = 1000;
      for (let i = 0; i < pathsToDelete.length; i += batchSize) {
        const batch = pathsToDelete.slice(i, i + batchSize);
        await tx
          .delete(files)
          .where(and(eq(files.userStorageId, storageId), inArray(files.path, batch)));
      }
      log('info', t('clearedMissing', { count: pathsToDelete.length }));
    }

    // 3. Update or insert files
    for (const file of fileList) {
      const existing = existingFileMap.get(file.relativePath);
      const currentFileName = path.basename(file.relativePath);
      const existingFileName = existing ? path.basename(existing.path) : null;
      const hasCurrentMtime = file.mtime instanceof Date;
      const hasExistingMtime = existing?.mtime instanceof Date;
      const isSameFile =
        Boolean(existing) &&
        existing?.path === file.relativePath &&
        existingFileName === currentFileName &&
        existing?.mimeType === file.mimeType &&
        typeof existing?.size === 'number' &&
        existing.size === file.size &&
        hasCurrentMtime &&
        hasExistingMtime &&
        existing.mtime.getTime() === file.mtime.getTime();

      if (mode === 'incremental' && isSameFile) {
        processed += 1;
        if (processed % 50 === 0 || processed === fileList.length) {
          onProgress?.({ stage: 'save', processed, total: fileList.length });
          log('info', t('processed', { processed, total: fileList.length }));
        }
        continue;
      }

      const blurHash = await generateBlurHash(file.absolutePath);

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
          mediaType: 'image',
          blurHash: blurHash,
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
            blurHash: blurHash,
            updatedAt: new Date(),
          },
        })
        .returning({ id: files.id });

      if (saved?.id) {
        const metadata = await readPhotoMetadata(file.absolutePath);
        
        let liveType = 'none';
        let videoOffset: number | null = null;
        let pairedPath: string | null = null;
        const imageExt = path.extname(file.absolutePath).toLowerCase();
        const canPairLive = LIVE_PHOTO_IMAGE_EXTENSIONS.has(imageExt);

        if (metadata?.motionPhoto && typeof metadata.videoOffset === 'number') {
          liveType = 'embedded';
          videoOffset = metadata.videoOffset;
        } else if (canPairLive) {
          const paired = await findPairedLiveVideo(file.absolutePath, file.mtime);
          if (paired) {
            liveType = 'paired';
            pairedPath = path.relative(rootPath, paired);
          }
        }

        if (metadata) {
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
              videoOffset,
              pairedPath,
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
                videoOffset,
                pairedPath,
              },
            });
        }
      }

      processed += 1;

      if (processed % 50 === 0 || processed === fileList.length) {
        onProgress?.({ stage: 'save', processed, total: fileList.length });
        log('info', t('processed', { processed, total: fileList.length }));
      }
    }

    await tx
      .update(files)
      .set({
        url: sql<string>`'/api/local-files/' || ${files.id}`,
        thumbUrl: sql<string>`'/api/local-files/' || ${files.id}`,
      })
      .where(eq(files.userStorageId, storageId));
  });

  return { processed, total: fileList.length };
}
