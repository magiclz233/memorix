import { fetchPublishedMediaForGallery } from '@/app/lib/data';
import { buildGalleryItems } from '@/app/lib/gallery';
import { GalleryInfinite } from '@/app/ui/front/gallery-infinite';

const PAGE_SIZE = 12;

export default async function Page() {
  const records = await fetchPublishedMediaForGallery({
    limit: PAGE_SIZE + 1,
    offset: 0,
  });
  const hasNext = records.length > PAGE_SIZE;
  const pageRecords = hasNext ? records.slice(0, PAGE_SIZE) : records;
  const items = buildGalleryItems(pageRecords);

  return (
    <GalleryInfinite
      initialItems={items}
      initialPage={1}
      pageSize={PAGE_SIZE}
      hasNext={hasNext}
    />
  );
}
