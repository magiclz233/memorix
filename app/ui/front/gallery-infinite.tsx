'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import type { GalleryItem } from '@/app/lib/gallery';
import { GallerySkeleton } from '@/app/ui/front/gallery-skeleton';
import { Spinner } from '@/app/ui/components/spinner';
import { BackToTop } from '@/app/ui/front/back-to-top';
import { Button } from '@/components/ui/button';

const Gallery25 = dynamic(
  () => import('@/components/gallery25').then((mod) => mod.Gallery25),
  {
    ssr: false,
    loading: () => <GallerySkeleton />,
  },
);

type GalleryResponse = {
  items: GalleryItem[];
  hasNext: boolean;
  page: number;
};

type GalleryInfiniteProps = {
  initialItems: GalleryItem[];
  hasNext: boolean;
  initialPage: number;
  pageSize: number;
  mediaType?: string;
  sortOrder?: string;
};

export function GalleryInfinite({
  initialItems,
  hasNext: initialHasNext,
  initialPage,
  pageSize,
  mediaType = 'all',
  sortOrder = 'newest',
}: GalleryInfiniteProps) {
  const t = useTranslations('front.gallery');
  const [items, setItems] = useState<GalleryItem[]>(initialItems);
  const [page, setPage] = useState(initialPage);
  const [hasNext, setHasNext] = useState(initialHasNext);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // 筛选变化时重置
  useEffect(() => {
    setItems(initialItems);
    setPage(initialPage);
    setHasNext(initialHasNext);
    setLoadError(false);
  }, [initialItems, initialPage, initialHasNext, mediaType, sortOrder]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasNext) return;
    setIsLoading(true);
    setLoadError(false);

    const nextPage = page + 1;
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: String(pageSize),
      mediaType,
      sortOrder,
    });

    try {
      const response = await fetch(`/api/gallery?${params.toString()}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to load next page');
      }

      const data = (await response.json()) as GalleryResponse;
      setItems((prev) => [...prev, ...data.items]);
      setPage(data.page);
      setHasNext(data.hasNext);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [hasNext, isLoading, page, pageSize, mediaType, sortOrder]);

  useEffect(() => {
    if (!hasNext || loadError) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNext, loadError, loadMore]);

  return (
    <>
      <Gallery25 items={items} />

      <div className='mt-10 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground'>
        {loadError ? (
          <>
            <p className='text-rose-600 dark:text-rose-400'>{t('loadError')}</p>
            <Button type='button' variant='outline' size='sm' onClick={loadMore}>
              {t('retryLoad')}
            </Button>
          </>
        ) : hasNext ? (
          <div className='inline-flex items-center gap-2'>
            {isLoading ? <Spinner size='sm' /> : null}
            <span>{isLoading ? t('loadingMore') : t('scrollMore')}</span>
          </div>
        ) : (
          <span>{t('allLoaded')}</span>
        )}
      </div>

      <div ref={sentinelRef} className='h-6' />
      <BackToTop label={t('backToTop')} />
    </>
  );
}
