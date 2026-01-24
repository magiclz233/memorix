'use client';

import { useMemo, useState } from 'react';
import type { MediaItem } from '@/app/lib/definitions';
import { MediaCard } from '@/app/ui/front/media-card';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
          <Button
            key={tab.value}
            type='button'
            variant={filter === tab.value ? 'secondary' : 'ghost'}
            size='sm'
            onClick={() => setFilter(tab.value)}
            className={cn(
              'rounded-full px-4 text-xs uppercase tracking-[0.3em]',
              filter === tab.value
                ? 'bg-zinc-100 dark:bg-white/10'
                : 'text-muted-foreground'
            )}
          >
            {t(tab.key)}
          </Button>
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
