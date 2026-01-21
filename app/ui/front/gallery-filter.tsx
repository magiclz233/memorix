'use client';

import { useMemo, useState } from 'react';
import type { MediaItem } from '@/app/lib/definitions';
import { MediaCard } from '@/app/ui/front/media-card';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

type GalleryFilterProps = {
  items: MediaItem[];
};

const filters = [
  { value: 'all', key: 'all' },
  { value: 'photo', key: 'photo' },
  { value: 'video', key: 'video' },
  { value: 'timeline', key: 'timeline' },
] as const;

type FilterValue = (typeof filters)[number]['value'];

export function GalleryFilter({ items }: GalleryFilterProps) {
  const t = useTranslations('front.gallery.filters');
  const [filter, setFilter] = useState<FilterValue>('all');

  const timelineItems = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [items]
  );

  const visibleItems = useMemo(() => {
    if (filter === 'timeline') return timelineItems;
    if (filter === 'all') return items;
    return items.filter((item) => item.type === filter);
  }, [filter, items, timelineItems]);

  return (
    <div className='space-y-8'>
      <div className='flex flex-wrap gap-2 rounded-full border border-zinc-200 bg-white px-2 py-2 text-sm shadow-sm backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900'>
        {filters.map((tab) => (
          <button
            key={tab.value}
            type='button'
            onClick={() => setFilter(tab.value)}
            className={cn(
              'rounded-full px-4 py-2 text-xs uppercase tracking-[0.3em] transition',
              filter === tab.value
                ? 'bg-zinc-100 text-zinc-900 dark:bg-white/10 dark:text-white'
                : 'text-zinc-600/80 hover:text-zinc-900 dark:text-white/60 dark:hover:text-white'
            )}
          >
            {t(tab.key)}
          </button>
        ))}
      </div>
      <div className='columns-1 gap-x-6 md:columns-2 xl:columns-3'>
        {visibleItems.map((item) => (
          <div
            key={item.id}
            className={cn('mb-6 break-inside-avoid')}
          >
            <MediaCard
              item={item}
              showDate={filter === 'timeline'}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
