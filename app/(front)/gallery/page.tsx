import { fetchPublishedMediaForGallery } from '@/app/lib/data';
import type { MediaItem } from '@/app/lib/definitions';
import { FrontGallery } from '@/app/ui/front/front-gallery';

const normalizeType = (mediaType?: string | null, mimeType?: string | null) => {
  if (mediaType === 'video' || mimeType?.startsWith('video/')) return 'video';
  return 'photo';
};

export default async function Page() {
  const records = await fetchPublishedMediaForGallery();
  const items: MediaItem[] = records.map((record) => {
    const title = record.title ?? record.path ?? '未命名';
    const createdAt = record.mtime
      ? new Date(record.mtime).toISOString()
      : new Date().toISOString();
    const coverUrl =
      record.thumbUrl || record.url || `/api/local-files/${record.id}`;

    return {
      id: String(record.id),
      type: normalizeType(record.mediaType, record.mimeType),
      title,
      coverUrl,
      tags: [],
      createdAt,
    };
  });

  return <FrontGallery items={items} />;
}
