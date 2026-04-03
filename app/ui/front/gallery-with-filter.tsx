'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GalleryInfinite } from '@/app/ui/front/gallery-infinite';
import type { GalleryItem } from '@/app/lib/gallery';
import { GallerySkeleton } from '@/app/ui/front/gallery-skeleton';

type MediaType = 'all' | 'photo' | 'video';
type SortOrder = 'newest' | 'oldest';

type GalleryWithFilterProps = {
  initialItems: GalleryItem[];
  initialHasNext: boolean;
  pageSize: number;
};

const mediaTypeFilters = [
  { value: 'all' as MediaType, key: 'all' },
  { value: 'photo' as MediaType, key: 'photo' },
  { value: 'video' as MediaType, key: 'video' },
] as const;

export function GalleryWithFilter({
  initialItems,
  initialHasNext,
  pageSize,
}: GalleryWithFilterProps) {
  const t = useTranslations('front.gallery');
  const [mediaType, setMediaType] = useState<MediaType>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [items, setItems] = useState<GalleryItem[]>(initialItems);
  const [hasNext, setHasNext] = useState(initialHasNext);
  const [isFiltering, startTransition] = useTransition();

  const applyFilter = async (newMediaType: MediaType, newSortOrder: SortOrder) => {
    startTransition(async () => {
      const params = new URLSearchParams({
        page: '1',
        pageSize: String(pageSize),
        mediaType: newMediaType,
        sortOrder: newSortOrder,
      });
      try {
        const res = await fetch(`/api/gallery?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        setItems(data.items);
        setHasNext(data.hasNext);
      } catch {
        // 静默失败，保留当前数据
      }
    });
  };

  const handleMediaTypeChange = (value: string) => {
    const next = value as MediaType;
    setMediaType(next);
    applyFilter(next, sortOrder);
  };

  const handleSortOrderChange = (value: string) => {
    const next = value as SortOrder;
    setSortOrder(next);
    applyFilter(mediaType, next);
  };

  return (
    <div className='space-y-8'>
      {/* 筛选栏 */}
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <Tabs value={mediaType} onValueChange={handleMediaTypeChange}>
          <TabsList className='h-auto rounded-full border border-zinc-200 bg-white/50 p-1 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/50'>
            {mediaTypeFilters.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className='rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.3em] data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-white/10'
              >
                {t(`filters.${tab.key}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Select value={sortOrder} onValueChange={handleSortOrderChange}>
          <SelectTrigger className='h-9 w-auto min-w-[120px] rounded-full border border-zinc-200 bg-white/50 px-4 text-xs backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/50'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='newest' className='text-xs'>{t('filters.newest')}</SelectItem>
            <SelectItem value='oldest' className='text-xs'>{t('filters.oldest')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 画廊内容 */}
      {isFiltering ? (
        <GallerySkeleton />
      ) : (
        <GalleryInfinite
          initialItems={items}
          initialPage={1}
          pageSize={pageSize}
          hasNext={hasNext}
          mediaType={mediaType}
          sortOrder={sortOrder}
        />
      )}
    </div>
  );
}
