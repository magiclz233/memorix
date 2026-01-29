import { notFound } from 'next/navigation';
import { fetchVideoSeriesById, fetchVideoSeriesItems } from '@/app/lib/data';
import { CollectionManager } from '@/app/ui/dashboard/collection-manager';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const collection = await fetchVideoSeriesById(Number(id));

  if (!collection) {
    notFound();
  }

  const items = await fetchVideoSeriesItems(collection.id);

  return (
    <CollectionManager
      collection={collection}
      initialItems={items}
      type="video"
    />
  );
}
