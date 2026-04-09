'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { MediaItem } from '@/app/lib/definitions';
import { MediaCard } from '@/app/ui/front/media-card';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

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

function applyFilter(
  filter: FilterValue,
  items: MediaItem[],
  timelineItems: MediaItem[],
) {
  if (filter === 'timeline') {
    return timelineItems;
  }

  if (filter === 'all') {
    return items;
  }

  return items.filter((item) => item.type === filter);
}

export function GalleryFilter({ items }: GalleryFilterProps) {
  const t = useTranslations('front.gallery');

  const [activeFilter, setActiveFilter] = useState<FilterValue>('all');
  const [mobileFilter, setMobileFilter] = useState<FilterValue>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimerRef = useRef<number | null>(null);

  const timelineItems = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [items],
  );

  const visibleItems = useMemo(
    () => applyFilter(activeFilter, items, timelineItems),
    [activeFilter, items, timelineItems],
  );

  const filterCounts = useMemo(() => {
    const photo = items.filter((item) => item.type === 'photo').length;
    const video = items.filter((item) => item.type === 'video').length;

    return {
      all: items.length,
      photo,
      video,
      timeline: items.length,
    };
  }, [items]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  const commitFilterChange = (nextFilter: FilterValue, closeSheet = false) => {
    if (nextFilter === activeFilter && !isTransitioning) {
      if (closeSheet) {
        setSheetOpen(false);
      }
      return;
    }

    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
    }

    setIsTransitioning(true);
    transitionTimerRef.current = window.setTimeout(() => {
      setActiveFilter(nextFilter);
      setMobileFilter(nextFilter);
      setIsTransitioning(false);
      if (closeSheet) {
        setSheetOpen(false);
      }
      transitionTimerRef.current = null;
    }, 220);
  };

  const applyMobileFilter = () => {
    commitFilterChange(mobileFilter, true);
  };

  const resetMobileFilter = () => {
    setMobileFilter('all');
    commitFilterChange('all', true);
  };

  return (
    <div className='space-y-8'>
      <div className='rounded-2xl border border-zinc-200 bg-white/85 p-3 shadow-sm backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/65'>
        <div className='flex items-center justify-between gap-3'>
          <Tabs
            value={activeFilter}
            onValueChange={(value) => {
              commitFilterChange(value as FilterValue);
            }}
            className='hidden w-full md:block'
          >
            <TabsList className='h-auto w-full justify-start rounded-xl bg-transparent p-0'>
              {filters.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className='group rounded-lg px-3 py-2 text-xs font-medium tracking-[0.16em] text-zinc-600 data-[state=active]:bg-zinc-900 data-[state=active]:text-white dark:text-zinc-400 dark:data-[state=active]:bg-zinc-100 dark:data-[state=active]:text-zinc-900'
                >
                  <span>{t(`filters.${tab.key}`)}</span>
                  <span className='ml-2 text-[10px] opacity-70'>
                    {filterCounts[tab.value]}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button type='button' variant='outline' className='md:hidden'>
                <SlidersHorizontal className='mr-2 h-4 w-4' />
                {t('filterButton')}
              </Button>
            </SheetTrigger>

            <SheetContent side='bottom' className='h-[80vh] rounded-t-2xl'>
              <SheetHeader>
                <SheetTitle>{t('filterTitle')}</SheetTitle>
                <SheetDescription>{t('filterDescription')}</SheetDescription>
              </SheetHeader>

              <div className='mt-6 space-y-2'>
                {filters.map((tab) => {
                  const active = mobileFilter === tab.value;

                  return (
                    <button
                      key={tab.value}
                      type='button'
                      onClick={() => setMobileFilter(tab.value)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition',
                        active
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                          : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/70',
                      )}
                    >
                      <span>{t(`filters.${tab.key}`)}</span>
                      <span className='text-xs text-zinc-500 dark:text-zinc-400'>
                        {filterCounts[tab.value]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className='mt-6 grid grid-cols-2 gap-2'>
                <Button type='button' variant='outline' onClick={resetMobileFilter}>
                  {t('resetFilters')}
                </Button>
                <Button type='button' onClick={applyMobileFilter}>
                  {t('applyFilters')}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <AnimatePresence mode='wait' initial={false}>
        {isTransitioning ? (
          <motion.div
            key='skeleton'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='columns-1 gap-x-6 md:columns-2 xl:columns-3'
          >
            {Array.from({ length: 9 }).map((_, index) => (
              <div
                key={index}
                className='mb-6 h-64 break-inside-avoid animate-pulse rounded-2xl bg-zinc-100/90 dark:bg-zinc-800/70'
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key={activeFilter}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            className='columns-1 gap-x-6 md:columns-2 xl:columns-3'
          >
            {visibleItems.map((item) => (
              <div key={item.id} className='mb-6 break-inside-avoid'>
                <MediaCard item={item} showDate={activeFilter === 'timeline'} />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
