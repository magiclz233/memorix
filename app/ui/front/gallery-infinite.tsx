'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { GalleryItem } from '@/app/lib/gallery';
import { GallerySkeleton } from '@/app/ui/front/gallery-skeleton';

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
};

export function GalleryInfinite({
  initialItems,
  hasNext: initialHasNext,
  initialPage,
  pageSize,
}: GalleryInfiniteProps) {
  const [items, setItems] = useState<GalleryItem[]>(initialItems);
  const [page, setPage] = useState(initialPage);
  const [hasNext, setHasNext] = useState(initialHasNext);
  const [isLoading, setIsLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasNext) return;
    setIsLoading(true);
    const nextPage = page + 1;
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: String(pageSize),
    });
    try {
      const response = await fetch(`/api/gallery?${params.toString()}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        setHasNext(false);
        return;
      }
      const data = (await response.json()) as GalleryResponse;
      setItems((prev) => [...prev, ...data.items]);
      setPage(data.page);
      setHasNext(data.hasNext);
    } finally {
      setIsLoading(false);
    }
  }, [hasNext, isLoading, page, pageSize]);

  useEffect(() => {
    if (!hasNext) return;
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
  }, [hasNext, loadMore]);

  return (
    <>
      <Gallery25 items={items} />
      <div className='mt-10 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground'>
        {hasNext ? (
          <span>{isLoading ? '加载中…' : '向下滚动加载更多'}</span>
        ) : (
          <span>已经到底了</span>
        )}
      </div>
      <div ref={sentinelRef} className='h-6' />
    </>
  );
}
