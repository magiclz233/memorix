'use client';

import { useMemo, useState } from 'react';
import type { MediaItem } from '@/app/lib/definitions';
import { MediaCard } from '@/app/ui/front/media-card';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as FilterValue)}
        className='flex justify-start'
      >
        <TabsList className='h-auto rounded-full border border-zinc-200 bg-white/50 p-1 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/50'>
          {filters.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className='rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.3em] data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-white/10'
            >
              {t(tab.key)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
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
