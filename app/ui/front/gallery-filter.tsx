'use client';

import { useMemo, useState } from 'react';
import type { MediaItem } from '@/app/lib/definitions';
import { MediaCard } from '@/app/ui/front/media-card';
import { cn } from '@/lib/utils';

type GalleryFilterProps = {
  items: MediaItem[];
};

const filters = [
  { value: 'all', label: '全部' },
  { value: 'photo', label: '照片' },
  { value: 'video', label: '视频' },
  { value: 'timeline', label: '时间线' },
] as const;

type FilterValue = (typeof filters)[number]['value'];

export function GalleryFilter({ items }: GalleryFilterProps) {
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
      <div className='flex flex-wrap gap-3 rounded-full border border-slate-200/70 bg-white/70 px-2 py-2 text-sm shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-none'>
        {filters.map((tab) => (
          <button
            key={tab.value}
            type='button'
            onClick={() => setFilter(tab.value)}
            className={cn(
              'rounded-full px-4 py-2 text-xs uppercase tracking-[0.3em] transition',
              filter === tab.value
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className='grid gap-6 md:grid-cols-2 xl:grid-cols-3'>
        {visibleItems.map((item, index) => (
          <div
            key={item.id}
            className={cn(
              index % 3 === 1 && 'md:translate-y-6',
              index % 3 === 2 && 'md:-translate-y-4'
            )}
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
