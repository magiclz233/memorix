import { eq, sql } from 'drizzle-orm';
import { db } from './drizzle';
import { files, photoMetadata } from './schema';
import { readPhotoMetadata, scanImageFiles, type ScanWalkEvent } from './storage';

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

type StorageScanOptions = {
  storageId: number;
  storageType: 'local' | 'nas';
  rootPath: string;
  onLog?: (entry: StorageScanLog) => void;
  onProgress?: (progress: StorageScanProgress) => void;
};

export async function runStorageScan({
  storageId,
  storageType,
  rootPath,
  onLog,
  onProgress,
}: StorageScanOptions) {
  const log = (level: StorageScanLogLevel, message: string) => {
    onLog?.({ level, message });
  };

  let scannedImages = 0;
  let scannedDirs = 0;

  const fileList = await scanImageFiles(rootPath, (event: ScanWalkEvent) => {
    if (event.kind === 'dir') {
      scannedDirs += 1;
      if (scannedDirs % 100 === 0) {
        log('info', `已扫描目录 ${scannedDirs} 个`);
      }
      return;
    }
    if (event.kind === 'file') {
      scannedImages += 1;
      if (scannedImages % 100 === 0) {
        log('info', `已发现 ${scannedImages} 张图片`);
      }
      return;
    }
    if (event.kind === 'error') {
      log('warn', `${event.message ?? '读取失败'}：${event.path}`);
    }
  });

  log('info', `扫描完成，发现 ${fileList.length} 张图片。`);

  let processed = 0;

  await db.transaction(async (tx) => {
    await tx.delete(files).where(eq(files.userStorageId, storageId));
    log('info', '旧记录已清空。');

    for (const file of fileList) {
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
            updatedAt: new Date(),
          },
        })
        .returning({ id: files.id });

      if (saved?.id) {
        const metadata = await readPhotoMetadata(file.absolutePath);
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
              },
            });
        }
      }

      processed += 1;

      if (processed % 50 === 0 || processed === fileList.length) {
        onProgress?.({ stage: 'save', processed, total: fileList.length });
        log('info', `已处理 ${processed}/${fileList.length} 张图片`);
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
