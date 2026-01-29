import { notFound } from 'next/navigation';
import { fetchCollectionById, fetchCollectionItems } from '@/app/lib/data';
import { CollectionManager } from '@/app/ui/dashboard/collection-manager';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const collection = await fetchCollectionById(Number(id));

  if (!collection) {
    notFound();
  }

  const items = await fetchCollectionItems(collection.id);

  return (
    <CollectionManager
      collection={collection}
      initialItems={items}
      type="photo"
    />
  );
}
