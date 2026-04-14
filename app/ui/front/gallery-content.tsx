import { fetchPublishedMediaById, fetchPublishedMediaForGallery } from '@/app/lib/data';
import { buildGalleryItems } from '@/app/lib/gallery';
import { GalleryWithFilter } from '@/app/ui/front/gallery-with-filter';
import { getFallbackItems } from '@/app/lib/front-data';

const PAGE_SIZE = 24;

type GalleryContentProps = {
  initialKeyword?: string;
  initialMediaId?: number | null;
};

export async function GalleryContent({
  initialKeyword = '',
  initialMediaId = null,
}: GalleryContentProps) {
  const keyword = initialKeyword.trim();
  const records = await fetchPublishedMediaForGallery({
    limit: PAGE_SIZE + 1,
    offset: 0,
    keyword,
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

  let items = buildGalleryItems(pageRecords);

  if (!hasRecords && !keyword) {
    items = getFallbackItems();
  }

  return (
    <GalleryWithFilter
      initialItems={items}
      initialHasNext={hasNext}
      pageSize={PAGE_SIZE}
      initialKeyword={keyword}
    />
  );
}
