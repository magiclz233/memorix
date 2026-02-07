'use client';

import { Gallery25 } from '@/components/gallery25';
import type { GalleryItem } from '@/app/lib/gallery';

type CollectionMediaSectionProps = {
  items: GalleryItem[];
  isCinema: boolean;
};

export function CollectionMediaSection({
  items,
  isCinema,
}: CollectionMediaSectionProps) {
  return (
    <section
      className="mt-16"
    >
      <Gallery25
        items={items}
        showHeader={false}
        className={isCinema ? 'dark' : undefined}
      />
    </section>
  );
}
