import path from 'path';
import { promises as fs } from 'fs';
import type { Dirent, Stats } from 'fs';
import exifr from 'exifr';

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

export type ImageFileInfo = {
  absolutePath: string;
  relativePath: string;
  title: string;
  size: number;
  mtime: Date;
  mimeType: string;
};

export type ParsedPhotoMetadata = {
  description?: string | null;
  camera?: string | null;
  maker?: string | null;
  lens?: string | null;
  dateShot?: Date | null;
  exposure?: number | null;
  aperture?: number | null;
  iso?: number | null;
  focalLength?: number | null;
  flash?: number | null;
  orientation?: number | null;
  exposureProgram?: number | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  resolutionWidth?: number | null;
  resolutionHeight?: number | null;
  whiteBalance?: string | null;
};

export type ScanWalkEvent = {
  kind: 'dir' | 'file' | 'error';
  path: string;
  message?: string;
};

function getMimeType(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  return IMAGE_MIME_BY_EXT[ext];
}

export async function scanImageFiles(
  rootPath: string,
  onEvent?: (event: ScanWalkEvent) => void,
) {
  const normalizedRoot = path.resolve(rootPath);
  const rootStat = await fs.stat(normalizedRoot);
  if (!rootStat.isDirectory()) {
    throw new Error('根目录不可用。');
  }
  const stack = [normalizedRoot];
  const results: ImageFileInfo[] = [];
  onEvent?.({ kind: 'dir', path: normalizedRoot });

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;

    let entries: Dirent[];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch (error) {
      onEvent?.({ kind: 'error', path: current, message: '读取目录失败' });
      console.warn('读取目录失败，已跳过：', current, error);
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        onEvent?.({ kind: 'dir', path: fullPath });
        stack.push(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;

      const mimeType = getMimeType(entry.name);
      if (!mimeType) continue;

      onEvent?.({ kind: 'file', path: fullPath });

      let stat: Stats;
      try {
        stat = await fs.stat(fullPath);
      } catch (error) {
        onEvent?.({ kind: 'error', path: fullPath, message: '读取文件信息失败' });
        console.warn('读取文件信息失败，已跳过：', fullPath, error);
        continue;
      }

      const relativePath = path.relative(normalizedRoot, fullPath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        continue;
      }

      results.push({
        absolutePath: fullPath,
        relativePath,
        title: entry.name,
        size: stat.size,
        mtime: stat.mtime,
        mimeType,
      });
    }
  }

  return results;
}

function normalizeWhiteBalance(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return `${value}`;
  return null;
}

function normalizeText(value: unknown) {
  if (typeof value === 'string') return value;
  return null;
}

export async function readPhotoMetadata(filePath: string) {
  try {
    const fileBuffer = await fs.readFile(filePath);
    const metadata = await exifr.parse(fileBuffer, {
      tiff: true,
      exif: true,
      gps: true,
    });

    if (!metadata) return null;

    const dateShot =
      metadata.DateTimeOriginal ??
      metadata.CreateDate ??
      metadata.ModifyDate ??
      null;

    return {
      description:
        normalizeText(metadata.ImageDescription) ??
        normalizeText(metadata.XPTitle) ??
        normalizeText(metadata.Title) ??
        null,
      camera: metadata.Model ?? null,
      maker: metadata.Make ?? null,
      lens: metadata.LensModel ?? null,
      dateShot: dateShot instanceof Date ? dateShot : null,
      exposure: typeof metadata.ExposureTime === 'number' ? metadata.ExposureTime : null,
      aperture: typeof metadata.FNumber === 'number' ? metadata.FNumber : null,
      iso: typeof metadata.ISO === 'number' ? metadata.ISO : null,
      focalLength: typeof metadata.FocalLength === 'number' ? metadata.FocalLength : null,
      flash: typeof metadata.Flash === 'number' ? metadata.Flash : null,
      orientation: typeof metadata.Orientation === 'number' ? metadata.Orientation : null,
      exposureProgram: typeof metadata.ExposureProgram === 'number' ? metadata.ExposureProgram : null,
      gpsLatitude: typeof metadata.GPSLatitude === 'number' ? metadata.GPSLatitude : null,
      gpsLongitude: typeof metadata.GPSLongitude === 'number' ? metadata.GPSLongitude : null,
      resolutionWidth:
        typeof metadata.ExifImageWidth === 'number'
          ? metadata.ExifImageWidth
          : typeof metadata.ImageWidth === 'number'
            ? metadata.ImageWidth
            : null,
      resolutionHeight:
        typeof metadata.ExifImageHeight === 'number'
          ? metadata.ExifImageHeight
          : typeof metadata.ImageHeight === 'number'
            ? metadata.ImageHeight
            : null,
      whiteBalance: normalizeWhiteBalance(metadata.WhiteBalance),
    } satisfies ParsedPhotoMetadata;
  } catch (error) {
    console.warn('读取 EXIF 失败，已忽略：', filePath, error);
    return null;
  }
}
