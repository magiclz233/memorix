export {
  fetchHeroPhotoIdsByUser,
  fetchHeroPhotosForHome,
  fetchPublishedMediaForGallery,
  fetchPublishedMediaById,
  fetchPublishedPhotosForHome,
  fetchHeroPhotosForHomeCached,
} from '../data-legacy';

export { fetchCollectionsCached } from '../data-legacy';

// 重新导出并添加缓存包装的版本
import { cache } from '../cache';
import { CacheKeys, CacheTTL } from '../cache-keys';
import { withQueryMonitor } from '../db-monitor';
import {
  fetchPublishedMediaForGallery as _fetchPublishedMediaForGallery,
} from '../data-legacy';

type FetchGalleryOptions = Parameters<typeof _fetchPublishedMediaForGallery>[0];

/**
 * 带缓存的画廊媒体查询
 * 缓存 TTL：60 秒
 */
export async function fetchPublishedMediaForGalleryCached(
  options: FetchGalleryOptions = {},
) {
  const mediaType = options.mediaTypes?.join(',') ?? 'all';
  const page = options.offset ? Math.floor(options.offset / (options.limit ?? 50)) : 0;
  const limit = options.limit ?? 50;
  const cacheKey = CacheKeys.galleryList(mediaType, page, limit);

  // 有关键词搜索时不缓存
  if (options.keyword) {
    return withQueryMonitor('fetchPublishedMediaForGallery', () =>
      _fetchPublishedMediaForGallery(options),
    );
  }

  return cache.wrap(cacheKey, CacheTTL.galleryList, () =>
    withQueryMonitor('fetchPublishedMediaForGallery', () =>
      _fetchPublishedMediaForGallery(options),
    ),
  );
}
