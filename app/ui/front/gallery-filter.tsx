'use client';

import { useMemo } from 'react';
import type { MediaItem } from '@/app/lib/definitions';
import type { GalleryItem } from '@/app/lib/gallery';
import { GalleryWithFilter } from '@/app/ui/front/gallery-with-filter';

type GalleryFilterProps = {
  items: MediaItem[];
  pageSize?: number;
};

const mapToGalleryItem = (item: MediaItem): GalleryItem => ({
  id: String(item.id),
  type: item.type,
  src: item.coverUrl || item.cover || `/api/local-files/${item.id}`,
  videoUrl: item.type === 'video' ? `/api/media/stream/${item.id}` : null,
  title: item.title,
  createdAt: item.createdAt,
  dateShot: item.createdAt,
  liveType: item.liveType ?? 'none',
});

export function GalleryFilter({ items, pageSize = 24 }: GalleryFilterProps) {
  const initialItems = useMemo(() => items.map(mapToGalleryItem), [items]);

  return (
    <GalleryWithFilter
      initialItems={initialItems}
      initialHasNext={false}
      pageSize={pageSize}
    />
  );
}