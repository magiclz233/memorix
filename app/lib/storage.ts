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

const MOTION_XMP_SCAN_BYTES = 512 * 1024;
const MIN_EMBEDDED_VIDEO_BYTES = 8 * 1024;
const MP4_HEADER_SCAN_BYTES = 64;
const MP4_FTYP = Buffer.from('ftyp');
const MP4_BRANDS = new Set(['isom', 'iso2', 'mp41', 'mp42', 'mp4v', 'avc1', 'av01']);

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
  // Motion Photo Info
  motionPhoto?: boolean;
  videoOffset?: number | null;
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
    throw new Error('Root directory invalid.');
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
      onEvent?.({ kind: 'error', path: current, message: 'Failed to read directory' });
      console.warn('Failed to read directory, skipped:', current, error);
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
        onEvent?.({ kind: 'error', path: fullPath, message: 'Failed to read file info' });
        console.warn('Failed to read file info, skipped:', fullPath, error);
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

function normalizeNumber(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'bigint') {
    const asNumber = Number(value);
    return Number.isFinite(asNumber) ? asNumber : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const asNumber = Number(trimmed);
    return Number.isFinite(asNumber) ? asNumber : null;
  }
  return null;
}

function normalizeBooleanFlag(value: unknown) {
  if (value === true) return true;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  }
  return false;
}

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildXmpNamePattern = (name: string) => {
  const escaped = escapeRegExp(name);
  if (name.includes(':')) return escaped;
  return `(?:[\\w-]+:)?${escaped}`;
};

const extractXmpSegment = (buffer: Buffer): string | null => {
  const scanSize = Math.min(buffer.length, MOTION_XMP_SCAN_BYTES);
  if (scanSize <= 0) return null;
  const header = buffer.toString('utf8', 0, scanSize);
  const startIndex = header.indexOf('<x:xmpmeta');
  if (startIndex === -1) return null;
  const endIndex = header.indexOf('</x:xmpmeta>');
  if (endIndex === -1) return null;
  return header.slice(startIndex, endIndex + '</x:xmpmeta>'.length);
};

const extractXmpBoolean = (xmp: string, name: string): boolean | null => {
  const regex = new RegExp(`<${buildXmpNamePattern(name)}>([^<]+)</[^>]+>`, 'i');
  const match = xmp.match(regex);
  if (!match) return null;
  return normalizeBooleanFlag(match[1]);
};

const extractXmpNumber = (xmp: string, name: string): number | null => {
  const regex = new RegExp(`<${buildXmpNamePattern(name)}>([^<]+)</[^>]+>`, 'i');
  const match = xmp.match(regex);
  if (!match) return null;
  return normalizeNumber(match[1]);
};

const extractXmpAttributeBoolean = (xmp: string, name: string): boolean | null => {
  const regex = new RegExp(`${buildXmpNamePattern(name)}="([^"]+)"`, 'i');
  const match = xmp.match(regex);
  if (!match) return null;
  return normalizeBooleanFlag(match[1]);
};

const extractXmpAttributeNumber = (xmp: string, name: string): number | null => {
  const regex = new RegExp(`${buildXmpNamePattern(name)}="([^"]+)"`, 'i');
  const match = xmp.match(regex);
  if (!match) return null;
  return normalizeNumber(match[1]);
};

const isLikelyMp4Header = (
  buffer: Buffer,
  start: number,
  requireBrand: boolean,
) => {
  if (start <= 0 || start >= buffer.length - MIN_EMBEDDED_VIDEO_BYTES) return false;
  const end = Math.min(buffer.length, start + MP4_HEADER_SCAN_BYTES);
  const header = buffer.subarray(start, end);
  const ftypIndex = header.indexOf(MP4_FTYP);
  if (ftypIndex < 4 || ftypIndex > 16) return false;
  const sizeOffset = start + ftypIndex - 4;
  if (sizeOffset + 4 > buffer.length) return false;
  let boxSize: number;
  try {
    boxSize = buffer.readUInt32BE(sizeOffset);
  } catch {
    return false;
  }
  if (!Number.isFinite(boxSize) || boxSize < 8) return false;
  if (sizeOffset + boxSize > buffer.length) return false;
  if (!requireBrand) return true;
  const brand = header
    .subarray(ftypIndex + 4, ftypIndex + 8)
    .toString('ascii')
    .trim()
    .toLowerCase();
  return brand.length > 0 && MP4_BRANDS.has(brand);
};

const resolveEmbeddedMp4Offset = (
  buffer: Buffer,
  offsetCandidates: Iterable<number>,
  allowFallback: boolean,
) => {
  for (const candidate of offsetCandidates) {
    if (!Number.isFinite(candidate)) continue;
    const starts = new Set<number>([candidate, buffer.length - candidate]);
    for (const start of starts) {
      if (isLikelyMp4Header(buffer, start, false)) {
        return start;
      }
    }
  }

  if (!allowFallback) return null;

  const searchStart = Math.max(0, buffer.length - 8 * 1024 * 1024);
  let cursor = buffer.indexOf(MP4_FTYP, searchStart);
  while (cursor !== -1) {
    const start = cursor - 4;
    if (isLikelyMp4Header(buffer, start, true)) {
      return start;
    }
    cursor = buffer.indexOf(MP4_FTYP, cursor + 1);
  }

  return null;
};

const detectMotionPhotoInfo = (
  buffer: Buffer,
  metadata: Record<string, unknown>,
): { motionPhoto: boolean; videoOffset: number | null } => {
  const offsetCandidates = new Set<number>();
  const motionFlags = [
    normalizeBooleanFlag((metadata as { MicroVideo?: unknown }).MicroVideo),
    normalizeBooleanFlag((metadata as { MotionPhoto?: unknown }).MotionPhoto),
  ];

  const microVideoOffset = normalizeNumber(
    (metadata as { MicroVideoOffset?: unknown }).MicroVideoOffset,
  );
  if (microVideoOffset !== null && microVideoOffset > 0) {
    offsetCandidates.add(microVideoOffset);
  }

  const xmpSegment = extractXmpSegment(buffer);
  if (xmpSegment) {
    const xmpFlags = [
      extractXmpBoolean(xmpSegment, 'MotionPhoto'),
      extractXmpBoolean(xmpSegment, 'GCamera:MotionPhoto'),
      extractXmpBoolean(xmpSegment, 'MicroVideo'),
      extractXmpBoolean(xmpSegment, 'GCamera:MicroVideo'),
      extractXmpAttributeBoolean(xmpSegment, 'MotionPhoto'),
      extractXmpAttributeBoolean(xmpSegment, 'GCamera:MotionPhoto'),
      extractXmpAttributeBoolean(xmpSegment, 'MicroVideo'),
      extractXmpAttributeBoolean(xmpSegment, 'GCamera:MicroVideo'),
    ].filter((flag) => flag !== null) as boolean[];
    if (xmpFlags.some(Boolean)) {
      motionFlags.push(true);
    }

    const xmpOffsets = [
      extractXmpNumber(xmpSegment, 'MicroVideoOffset'),
      extractXmpNumber(xmpSegment, 'GCamera:MicroVideoOffset'),
      extractXmpAttributeNumber(xmpSegment, 'MicroVideoOffset'),
      extractXmpAttributeNumber(xmpSegment, 'GCamera:MicroVideoOffset'),
    ].filter((value) => typeof value === 'number') as number[];
    xmpOffsets.forEach((offset) => {
      if (offset > 0) {
        offsetCandidates.add(offset);
      }
    });
  }

  const hasMotionHint = motionFlags.some(Boolean) || offsetCandidates.size > 0;
  const videoOffset = resolveEmbeddedMp4Offset(
    buffer,
    offsetCandidates,
    hasMotionHint,
  );

  return {
    motionPhoto: hasMotionHint || videoOffset !== null,
    videoOffset,
  };
};

export async function readPhotoMetadata(filePath: string) {
  let fileBuffer: Buffer;
  try {
    fileBuffer = await fs.readFile(filePath);
  } catch (error) {
    console.warn('Failed to read file, ignored:', filePath, error);
    return null;
  }

  let metadata: Record<string, unknown> | null = null;
  try {
    metadata = await exifr.parse(fileBuffer, {
      tiff: true,
      exif: true,
      gps: true,
      xmp: true,
    });
  } catch (error) {
    console.warn('Failed to read EXIF, ignored:', filePath, error);
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
      console.warn('Failed to read image dimensions, ignored:', filePath, error);
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
    motionPhoto: false,
    videoOffset: null,
  };
  const motionInfo = detectMotionPhotoInfo(fileBuffer, safeMetadata);
  result.motionPhoto = motionInfo.motionPhoto;
  result.videoOffset = motionInfo.videoOffset;

  const hasAnyMetadata = Object.values(result).some(
    (value) => value !== null && value !== undefined,
  );

  return hasAnyMetadata ? result : null;
}
