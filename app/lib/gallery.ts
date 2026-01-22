import type { fetchPublishedMediaForGallery } from '@/app/lib/data';

export type GalleryItem = {
  id: string;
  type: 'photo' | 'video';
  src: string;
  title: string;
  description?: string | null;
  camera?: string | null;
  maker?: string | null;
  lens?: string | null;
  exposure?: number | null;
  aperture?: number | null;
  iso?: number | null;
  focalLength?: number | null;
  whiteBalance?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  width?: number | null;
  height?: number | null;
  size?: number | null;
  dateShot?: string | null;
  createdAt?: string | null;
  blurHash?: string | null;
};

type GalleryRecord = Awaited<
  ReturnType<typeof fetchPublishedMediaForGallery>
>[number];

const normalizeType = (mediaType?: string | null, mimeType?: string | null) => {
  if (mediaType === 'video' || mimeType?.startsWith('video/')) return 'video';
  return 'photo';
};

const normalizeDate = (value?: string | Date | null) => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

export const buildGalleryItems = (records: GalleryRecord[]) =>
  records.reduce<GalleryItem[]>((acc, record) => {
    const title = record.title ?? record.path ?? 'front.gallery.unnamed';
    const mediaType = normalizeType(record.mediaType, record.mimeType);
    const isVideo = mediaType === 'video';
    const src =
      record.thumbUrl ||
      (!isVideo ? record.url : null) ||
      (!isVideo ? `/api/local-files/${record.id}` : null);
    if (!src) return acc;
    const shotAt = record.dateShot ?? record.mtime;
    acc.push({
      id: String(record.id),
      type: mediaType,
      src,
      title,
      description: record.description ?? null,
      camera: record.camera ?? null,
      maker: record.maker ?? null,
      lens: record.lens ?? null,
      exposure: record.exposure ?? null,
      aperture: record.aperture ?? null,
      iso: record.iso ?? null,
      focalLength: record.focalLength ?? null,
      whiteBalance: record.whiteBalance ?? null,
      gpsLatitude: record.gpsLatitude ?? null,
      gpsLongitude: record.gpsLongitude ?? null,
      width: record.resolutionWidth ?? null,
      height: record.resolutionHeight ?? null,
      size: record.size ?? null,
      dateShot: normalizeDate(shotAt),
      createdAt: normalizeDate(record.mtime),
      blurHash: record.blurHash ?? null,
    });
    return acc;
  }, []);
