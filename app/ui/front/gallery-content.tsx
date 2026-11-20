import { fetchPublishedMediaById, fetchPublishedMediaForGallery } from '@/app/lib/data';
import { buildGalleryItems } from '@/app/lib/gallery';
import {
  encodeGalleryCursor,
  galleryCursorFromRecord,
} from '@/app/lib/gallery-cursor';
import { GalleryWithFilter } from '@/app/ui/front/gallery-with-filter';
import { getFallbackItems } from '@/app/lib/front-data';

const PAGE_SIZE = 24;

type GalleryContentProps = {
  initialKeyword?: string;
  initialMediaId?: number | null;
  initialMediaType?: 'all' | 'photo' | 'video';
  initialSortOrder?: 'newest' | 'oldest';
};

const toMediaTypes = (type: 'all' | 'photo' | 'video'): Array<'image' | 'video' | 'animated'> =>
  type === 'photo'
    ? ['image', 'animated']
    : type === 'video'
      ? ['video']
      : ['image', 'video', 'animated'];

export async function GalleryContent({
  initialKeyword = '',
  initialMediaId = null,
  initialMediaType = 'all',
  initialSortOrder = 'newest',
}: GalleryContentProps) {
  const keyword = initialKeyword.trim();
  // 首屏就按 URL 里的 mediaType/sortOrder 查询，避免客户端拿到「全部」后再
  // 二次请求筛选结果（P1-5：首屏忽略 URL 参数导致二次请求）。
  const records = await fetchPublishedMediaForGallery({
    limit: PAGE_SIZE + 1,
    offset: 0,
    keyword,
    mediaTypes: toMediaTypes(initialMediaType),
    sortOrder: initialSortOrder,
  });

  const hasRecords = records.length > 0;
  const hasNext = records.length > PAGE_SIZE;
  const pageRecords = hasNext ? records.slice(0, PAGE_SIZE) : [...records];

  if (initialMediaId && !pageRecords.some((record) => record.id === initialMediaId)) {
    const targetRecord = await fetchPublishedMediaById(initialMediaId);
    if (targetRecord) {
      pageRecords.unshift(targetRecord);
      if (pageRecords.length > PAGE_SIZE) {
        pageRecords.pop();
      }
    }
  }

  const lastRecord = pageRecords[pageRecords.length - 1];
  const lastCursor = lastRecord ? galleryCursorFromRecord(lastRecord) : null;
  const initialCursor = hasNext && lastCursor ? encodeGalleryCursor(lastCursor) : null;

  let items = buildGalleryItems(pageRecords);

  if (!hasRecords && !keyword) {
    items = getFallbackItems();
  }

  return (
    <GalleryWithFilter
      initialItems={items}
      initialHasNext={hasNext}
      initialCursor={initialCursor}
      pageSize={PAGE_SIZE}
      initialKeyword={keyword}
      initialMediaType={initialMediaType}
      initialSortOrder={initialSortOrder}
    />
  );
}
