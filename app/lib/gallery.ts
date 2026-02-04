import type { fetchPublishedMediaForGallery } from '@/app/lib/data';

export type GalleryItem = {
  id: string;
  type: 'photo' | 'video';
  src: string;
  videoUrl?: string | null;
  animatedUrl?: string | null;
  isAnimated?: boolean;
  duration?: number | null;
  title: string;
  description?: string | null;
  camera?: string | null;
  maker?: string | null;
  lens?: string | null;
  exposure?: number | null;
  aperture?: number | null;
  iso?: number | null;
  focalLength?: number | null;
  focalLengthIn35mmFormat?: number | null;
  colorSpace?: string | null;
  locationName?: string | null;
  whiteBalance?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  width?: number | null;
  height?: number | null;
  size?: number | null;
  dateShot?: string | null;
  createdAt?: string | null;
  blurHash?: string | null;
  liveType?: 'none' | 'embedded' | 'paired';
};

type GalleryRecord = Awaited<
  ReturnType<typeof fetchPublishedMediaForGallery>
>[number];

const normalizeType = (mediaType?: string | null, mimeType?: string | null) => {
  if (mediaType === 'video' || mimeType?.startsWith('video/')) return 'video';
  return 'photo';
};

const isAnimatedMedia = (mediaType?: string | null, mimeType?: string | null) =>
  mediaType === 'animated' || mimeType === 'image/gif';

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
    const isAnimated = isAnimatedMedia(record.mediaType, record.mimeType);
    const src =
      record.thumbUrl ||
      (isVideo || isAnimated ? `/api/media/thumb/${record.id}` : null) ||
      (!isVideo ? record.url : null) ||
      (!isVideo ? `/api/local-files/${record.id}` : null);
    if (!src) return acc;
    const shotAt = record.dateShot ?? record.mtime;
    const animatedUrl = isAnimated
      ? record.url || `/api/local-files/${record.id}`
      : null;
    const videoUrl = isVideo ? `/api/media/stream/${record.id}` : null;
    const width = record.resolutionWidth ?? record.videoWidth ?? null;
    const height = record.resolutionHeight ?? record.videoHeight ?? null;
    acc.push({
      id: String(record.id),
      type: mediaType,
      src,
      videoUrl,
      animatedUrl,
      isAnimated,
      duration: record.videoDuration ?? null,
      title,
      description: record.description ?? null,
      camera: record.camera ?? null,
      maker: record.maker ?? null,
      lens: record.lens ?? null,
      exposure: record.exposure ?? null,
      aperture: record.aperture ?? null,
      iso: record.iso ?? null,
      focalLength: record.focalLength ?? null,
      focalLengthIn35mmFormat: record.focalLengthIn35mmFormat ?? null,
      colorSpace: record.colorSpace ?? null,
      locationName: record.locationName ?? null,
      whiteBalance: record.whiteBalance ?? null,
      gpsLatitude: record.gpsLatitude ?? null,
      gpsLongitude: record.gpsLongitude ?? null,
      width,
      height,
      size: record.size ?? null,
      dateShot: normalizeDate(shotAt),
      createdAt: normalizeDate(record.mtime),
      blurHash: record.blurHash ?? null,
      liveType: (record.liveType as 'none' | 'embedded' | 'paired') ?? 'none',
    });
    return acc;
  }, []);
