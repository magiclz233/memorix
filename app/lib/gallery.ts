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
  author?: string | null;
  camera?: string | null;
  maker?: string | null;
  lens?: string | null;
  exposure?: number | null;
  aperture?: number | null;
  iso?: number | null;
  focalLength?: number | null;
  focalLengthIn35mmFormat?: number | null;
  flash?: number | null;
  exposureProgram?: number | null;
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
  /** 与 DB sort_at 同源的排序时间；时间轴分组优先用它，避免时区/空值错位 */
  sortAt?: string | null;
  blurHash?: string | null;
  tags?: string[];
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

/**
 * 把内部媒体 API 的相对路径补上分享 token（P1-1）。
 * 分享页的私有图靠这个 token + 解锁 cookie 通过投递端点的授权。
 * 普通画廊不传 token，行为完全不变。
 */
const withShareToken = (src: string | null | undefined, shareToken?: string) => {
  if (!src || !shareToken) return src ?? null;
  if (!src.startsWith('/api/')) return src;
  const separator = src.includes('?') ? '&' : '?';
  return `${src}${separator}share=${encodeURIComponent(shareToken)}`;
};

export const buildGalleryItems = (
  records: GalleryRecord[],
  shareToken?: string,
) =>
  records.reduce<GalleryItem[]>((acc, record) => {
    const title = record.title ?? record.path ?? 'front.gallery.unnamed';
    const mediaType = normalizeType(record.mediaType, record.mimeType);
    const isVideo = mediaType === 'video';
    const isAnimated = isAnimatedMedia(record.mediaType, record.mimeType);
    // 网格一律优先走缩略图路由：即使没有预生成 thumbUrl，也让 /api/media/thumb
    // 按需生成并缓存小图，避免万张图库里网格直接拉取几十 MB 的原始文件。
    // 但 HEIC/实况图 thumb 路由在缩略图生成失败时会返回 1×1 占位图，这类记录
    // 必须保留原图回退，否则原本能显示的图会变成空白。
    // 分享页：所有媒体都必须经过内部投递路由，以便用 token + 解锁 cookie 鉴权。
    // 绝不能直接用 record.url / thumbUrl——它们可能是绝对 S3 地址，会绕过授权。
    const rawSrc = shareToken
      ? `/api/media/thumb/${record.id}`
      : record.thumbUrl ||
        (isVideo || isAnimated ? `/api/media/thumb/${record.id}` : null) ||
        (!isVideo ? record.url : null) ||
        (!isVideo ? `/api/local-files/${record.id}` : null) ||
        `/api/media/thumb/${record.id}`;
    const src = withShareToken(rawSrc, shareToken);
    if (!src) return acc;
    const shotAt = record.dateShot ?? record.mtime;
    const animatedUrl = isAnimated
      ? withShareToken(
          shareToken ? `/api/local-files/${record.id}` : record.url || `/api/local-files/${record.id}`,
          shareToken,
        )
      : null;
    const videoUrl = isVideo
      ? withShareToken(`/api/media/stream/${record.id}`, shareToken)
      : null;
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
      author: record.author ?? null,
      camera: record.camera ?? null,
      maker: record.maker ?? null,
      lens: record.lens ?? null,
      exposure: record.exposure ?? null,
      aperture: record.aperture ?? null,
      iso: record.iso ?? null,
      focalLength: record.focalLength ?? null,
      focalLengthIn35mmFormat: record.focalLengthIn35mmFormat ?? null,
      flash: record.flash ?? null,
      exposureProgram: record.exposureProgram ?? null,
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
      sortAt: normalizeDate(record.sortAt),
      blurHash: record.blurHash ?? null,
      tags: Array.isArray(record.tags) ? record.tags : [],
      liveType: (record.liveType as 'none' | 'embedded' | 'paired') ?? 'none',
    });
    return acc;
  }, []);
