import { notFound } from 'next/navigation';
import {
  fetchCollectionById,
  fetchCollectionMediaItems,
} from '@/app/lib/data';
import { CollectionManager } from '@/app/ui/dashboard/collection-manager';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const collection = await fetchCollectionById(Number(id), {
    includeUnpublished: true,
  });

  if (!collection) {
    notFound();
  }

  const items = await fetchCollectionMediaItems(collection.id);
  const itemsKey = items.length
    ? items
        .map((item) => `${item.file.id}:${item.sortOrder}`)
        .join('|')
    : 'empty';

  return (
    <CollectionManager
      key={`${collection.id}-${itemsKey}`}
      collection={{ id: collection.id, title: collection.title, type: collection.type }}
      initialItems={items.map((item) => ({
        file: {
          id: item.file.id,
          title: item.file.title,
          url: item.file.url,
          thumbUrl: item.file.thumbUrl,
          mediaType: item.file.mediaType,
          blurHash: item.file.blurHash,
          width: item.photoMetadata?.resolutionWidth || item.videoMetadata?.width,
          height: item.photoMetadata?.resolutionHeight || item.videoMetadata?.height,
          videoDuration: item.videoMetadata?.duration,
        },
        sortOrder: item.sortOrder,
      }))}
    />
  );
}
