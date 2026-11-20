'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import type { GalleryItem } from '@/app/lib/gallery';
import { VirtualPhotoGrid } from '@/app/ui/front/gallery/virtual-photo-grid';
import { GallerySkeleton } from '@/app/ui/front/gallery-skeleton';
import { Spinner } from '@/app/ui/components/spinner';
import { BackToTop } from '@/app/ui/front/back-to-top';
import { Button } from '@/components/ui/button';

// P1-5：Gallery25 的 window/localStorage 访问都在 effect 或 typeof 守卫内，
// 可安全 SSR。去掉 ssr:false 让首屏直接输出真实网格而非空骨架。
const Gallery25 = dynamic(
  () => import('@/components/gallery25').then((mod) => mod.Gallery25),
  {
    ssr: true,
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
  keyword?: string;
  selectedId?: string | null;
  onSelectedIdChange?: (id: string | number | null) => void;
};

export function GalleryInfinite({
  initialItems,
  hasNext: initialHasNext,
  initialPage,
  pageSize,
  mediaType = 'all',
  sortOrder = 'newest',
  keyword = '',
  selectedId,
  onSelectedIdChange,
}: GalleryInfiniteProps) {
  const t = useTranslations('front.gallery');
  const [items, setItems] = useState<GalleryItem[]>(initialItems);
  const [page, setPage] = useState(initialPage);
  const [hasNext, setHasNext] = useState(initialHasNext);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // P1-3：只在挂载时决定一次渲染器，避免滚动中切换导致跳动。
  // 首屏还有下一页 => 判定为「大图库」=> 用窗口虚拟化（DOM 恒定）；
  // 小图库（一页装得下）继续用功能更全的 Gallery25。
  const [useVirtual] = useState(() => initialHasNext && initialItems.length > 0);

  useEffect(() => {
    setItems(initialItems);
    setPage(initialPage);
    setHasNext(initialHasNext);
    setLoadError(false);
  }, [initialItems, initialPage, initialHasNext, mediaType, sortOrder, keyword]);

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
    if (keyword) {
      params.set('q', keyword);
    }

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
  }, [hasNext, isLoading, keyword, mediaType, page, pageSize, sortOrder]);

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
      {useVirtual ? (
        <VirtualPhotoGrid
          items={items}
          columns={4}
          selectedId={selectedId ?? null}
          onSelectedIdChange={onSelectedIdChange}
        />
      ) : (
        <Gallery25
          items={items}
          showFilters={false}
          selectedId={selectedId ?? null}
          onSelectedIdChange={onSelectedIdChange}
        />
      )}

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
