import { fetchPublishedMediaForGallery } from '@/app/lib/data';
import { buildGalleryItems } from '@/app/lib/gallery';
import { GalleryWithFilter } from '@/app/ui/front/gallery-with-filter';
import { getFallbackItems } from '@/app/lib/front-data';

const PAGE_SIZE = 24;

export async function GalleryContent() {
  const records = await fetchPublishedMediaForGallery({
    limit: PAGE_SIZE + 1,
    offset: 0,
  });

  const hasRecords = records.length > 0;
  const hasNext = records.length > PAGE_SIZE;
  const pageRecords = hasNext ? records.slice(0, PAGE_SIZE) : records;

  let items = buildGalleryItems(pageRecords);

  if (!hasRecords) {
    items = getFallbackItems();
  }

  return (
    <GalleryWithFilter
      initialItems={items}
      initialHasNext={hasNext}
      pageSize={PAGE_SIZE}
    />
  );
}
