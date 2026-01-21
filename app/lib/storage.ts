import path from 'path';
import { promises as fs } from 'fs';
import type { Dirent, Stats } from 'fs';
import exifr from 'exifr';
import sharp from 'sharp';

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
  let fileBuffer: Buffer;
  try {
    fileBuffer = await fs.readFile(filePath);
  } catch (error) {
    console.warn('读取文件失败，已忽略：', filePath, error);
    return null;
  }

  let metadata: Record<string, unknown> | null = null;
  try {
    metadata = await exifr.parse(fileBuffer, {
      tiff: true,
      exif: true,
      gps: true,
    });
  } catch (error) {
    console.warn('读取 EXIF 失败，已忽略：', filePath, error);
  }

  const safeMetadata = metadata ?? {};
  const dateShot =
    (safeMetadata as { DateTimeOriginal?: unknown }).DateTimeOriginal ??
    (safeMetadata as { CreateDate?: unknown }).CreateDate ??
    (safeMetadata as { ModifyDate?: unknown }).ModifyDate ??
    null;

  let resolutionWidth =
    typeof (safeMetadata as { ExifImageWidth?: unknown }).ExifImageWidth === 'number'
      ? ((safeMetadata as { ExifImageWidth?: number }).ExifImageWidth ?? null)
      : typeof (safeMetadata as { ImageWidth?: unknown }).ImageWidth === 'number'
        ? ((safeMetadata as { ImageWidth?: number }).ImageWidth ?? null)
        : null;
  let resolutionHeight =
    typeof (safeMetadata as { ExifImageHeight?: unknown }).ExifImageHeight === 'number'
      ? ((safeMetadata as { ExifImageHeight?: number }).ExifImageHeight ?? null)
      : typeof (safeMetadata as { ImageHeight?: unknown }).ImageHeight === 'number'
        ? ((safeMetadata as { ImageHeight?: number }).ImageHeight ?? null)
        : null;

  if (!resolutionWidth || !resolutionHeight) {
    try {
      const size = await sharp(fileBuffer).metadata();
      if (typeof size.width === 'number') {
        resolutionWidth = size.width;
      }
      if (typeof size.height === 'number') {
        resolutionHeight = size.height;
      }
    } catch (error) {
      console.warn('读取图片尺寸失败，已忽略：', filePath, error);
    }
  }

  const result: ParsedPhotoMetadata = {
    description:
      normalizeText((safeMetadata as { ImageDescription?: unknown }).ImageDescription) ??
      normalizeText((safeMetadata as { XPTitle?: unknown }).XPTitle) ??
      normalizeText((safeMetadata as { Title?: unknown }).Title) ??
      null,
    camera: (safeMetadata as { Model?: string | null }).Model ?? null,
    maker: (safeMetadata as { Make?: string | null }).Make ?? null,
    lens: (safeMetadata as { LensModel?: string | null }).LensModel ?? null,
    dateShot: dateShot instanceof Date ? dateShot : null,
    exposure:
      typeof (safeMetadata as { ExposureTime?: unknown }).ExposureTime === 'number'
        ? ((safeMetadata as { ExposureTime?: number }).ExposureTime ?? null)
        : null,
    aperture:
      typeof (safeMetadata as { FNumber?: unknown }).FNumber === 'number'
        ? ((safeMetadata as { FNumber?: number }).FNumber ?? null)
        : null,
    iso:
      typeof (safeMetadata as { ISO?: unknown }).ISO === 'number'
        ? ((safeMetadata as { ISO?: number }).ISO ?? null)
        : null,
    focalLength:
      typeof (safeMetadata as { FocalLength?: unknown }).FocalLength === 'number'
        ? ((safeMetadata as { FocalLength?: number }).FocalLength ?? null)
        : null,
    flash:
      typeof (safeMetadata as { Flash?: unknown }).Flash === 'number'
        ? ((safeMetadata as { Flash?: number }).Flash ?? null)
        : null,
    orientation:
      typeof (safeMetadata as { Orientation?: unknown }).Orientation === 'number'
        ? ((safeMetadata as { Orientation?: number }).Orientation ?? null)
        : null,
    exposureProgram:
      typeof (safeMetadata as { ExposureProgram?: unknown }).ExposureProgram === 'number'
        ? ((safeMetadata as { ExposureProgram?: number }).ExposureProgram ?? null)
        : null,
    gpsLatitude:
      typeof (safeMetadata as { GPSLatitude?: unknown }).GPSLatitude === 'number'
        ? ((safeMetadata as { GPSLatitude?: number }).GPSLatitude ?? null)
        : null,
    gpsLongitude:
      typeof (safeMetadata as { GPSLongitude?: unknown }).GPSLongitude === 'number'
        ? ((safeMetadata as { GPSLongitude?: number }).GPSLongitude ?? null)
        : null,
    resolutionWidth,
    resolutionHeight,
    whiteBalance: normalizeWhiteBalance(
      (safeMetadata as { WhiteBalance?: unknown }).WhiteBalance,
    ),
  };

  const hasAnyMetadata = Object.values(result).some(
    (value) => value !== null && value !== undefined,
  );

  return hasAnyMetadata ? result : null;
}
