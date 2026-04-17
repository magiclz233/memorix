'use client';

import { useState, useEffect, useCallback } from 'react';

interface GalleryItem {
  id: number;
  url: string;
  thumbUrl: string | null;
  blurHash: string | null;
  mediaType: string;
  title: string | null;
  [key: string]: unknown;
}

interface GalleryDataResult {
  items: GalleryItem[];
  isLoading: boolean;
  isError: boolean;
  refresh: () => void;
}

// 简单的内存缓存（SWR 模式）
const cache = new Map<string, { data: GalleryItem[]; timestamp: number }>();
const DEDUP_INTERVAL = 60000; // 60 秒内不重复请求

/**
 * 画廊数据 Hook（SWR 模式）
 * 优先显示缓存内容，后台重新验证
 */
export function useGalleryData(mediaType?: string): GalleryDataResult {
  const cacheKey = `/api/gallery?type=${mediaType || 'all'}`;
  const [items, setItems] = useState<GalleryItem[]>(() => {
    const cached = cache.get(cacheKey);
    return cached ? cached.data : [];
  });
  const [isLoading, setIsLoading] = useState(!cache.has(cacheKey));
  const [isError, setIsError] = useState(false);

  const fetchData = useCallback(async () => {
    const cached = cache.get(cacheKey);
    const now = Date.now();

    // 缓存未过期，跳过请求
    if (cached && now - cached.timestamp < DEDUP_INTERVAL) {
      setItems(cached.data);
      setIsLoading(false);
      return;
    }

    try {
      setIsError(false);
      const res = await fetch(cacheKey);
      if (!res.ok) throw new Error('Failed to fetch gallery data');

      const data = await res.json();
      const newItems = data.items || [];

      cache.set(cacheKey, { data: newItems, timestamp: now });
      setItems(newItems);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    items,
    isLoading,
    isError,
    refresh: fetchData,
  };
}
