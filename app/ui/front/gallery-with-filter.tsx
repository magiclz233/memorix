'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/app/ui/hooks/use-debounce';
import { GalleryInfinite } from '@/app/ui/front/gallery-infinite';
import type { GalleryItem } from '@/app/lib/gallery';
import { GallerySkeleton } from '@/app/ui/front/gallery-skeleton';

type MediaType = 'all' | 'photo' | 'video';
type SortOrder = 'newest' | 'oldest';

type GalleryWithFilterProps = {
  initialItems: GalleryItem[];
  initialHasNext: boolean;
  initialCursor: string | null;
  pageSize: number;
  initialKeyword?: string;
  initialMediaType?: MediaType;
  initialSortOrder?: SortOrder;
};

const mediaTypeFilters = [
  { value: 'all' as MediaType, key: 'all' },
  { value: 'photo' as MediaType, key: 'photo' },
  { value: 'video' as MediaType, key: 'video' },
] as const;

export function GalleryWithFilter({
  initialItems,
  initialHasNext,
  initialCursor,
  pageSize,
  initialKeyword = '',
  initialMediaType = 'all',
  initialSortOrder = 'newest',
}: GalleryWithFilterProps) {
  const t = useTranslations('front.gallery');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 首屏状态直接来自服务端（已按这些参数查过 DB），不再从 URL 二次派生，
  // 否则 SSR 用一套、客户端 effect 又发一次相同请求（P1-5）。
  const [mediaType, setMediaType] = useState<MediaType>(initialMediaType);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [items, setItems] = useState<GalleryItem[]>(initialItems);
  const [hasNext, setHasNext] = useState(initialHasNext);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get('media'),
  );
  const [isFiltering, startTransition] = useTransition();

  const debouncedKeyword = useDebounce(keyword, 280);
  // 用服务端已应用的筛选值作为基线，避免挂载后立刻重复请求当前筛选。
  const lastFilterKeyRef = useRef(
    `${initialMediaType}|${initialSortOrder}|${initialKeyword.trim()}`,
  );

  const replaceQuery = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([key, value]) => {
        if (!value) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      const query = params.toString();
      const nextUrl = query ? `${pathname}?${query}` : pathname;
      const currentUrl = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;

      if (nextUrl !== currentUrl) {
        router.replace(nextUrl, { scroll: false });
      }
    },
    [pathname, router, searchParams],
  );

  const normalizedKeyword = useMemo(() => debouncedKeyword.trim(), [debouncedKeyword]);

  const applyFilter = useCallback(
    async (nextMediaType: MediaType, nextSortOrder: SortOrder, nextKeyword: string) => {
      // 更新 URL 参数
      replaceQuery({
        mediaType: nextMediaType !== 'all' ? nextMediaType : null,
        sortOrder: nextSortOrder !== 'newest' ? nextSortOrder : null,
        q: nextKeyword || null,
      });
      
      startTransition(async () => {
        const params = new URLSearchParams({
          page: '1',
          pageSize: String(pageSize),
          mediaType: nextMediaType,
          sortOrder: nextSortOrder,
        });
        if (nextKeyword) {
          params.set('q', nextKeyword);
        }

        try {
          const res = await fetch(`/api/gallery?${params.toString()}`, { cache: 'no-store' });
          if (!res.ok) return;
          const data = (await res.json()) as {
            items: GalleryItem[];
            hasNext: boolean;
            nextCursor: string | null;
          };
          setItems(data.items);
          setHasNext(data.hasNext);
          setCursor(data.nextCursor ?? null);
          setSelectedId(null);
        } catch {
          // 静默失败，保留当前数据
        }
      });
    },
    [pageSize, replaceQuery],
  );

  useEffect(() => {
    const filterKey = `${mediaType}|${sortOrder}|${normalizedKeyword}`;
    if (lastFilterKeyRef.current === filterKey) {
      return;
    }
    lastFilterKeyRef.current = filterKey;
    void applyFilter(mediaType, sortOrder, normalizedKeyword);
  }, [applyFilter, mediaType, normalizedKeyword, sortOrder]);

  useEffect(() => {
    setSelectedId(searchParams.get('media'));
  }, [searchParams]);

  const handleSelectedIdChange = (id: string | number | null) => {
    const next = id === null ? null : String(id);
    setSelectedId(next);
    replaceQuery({ media: next });
  };

  const clearKeyword = () => {
    setKeyword('');
  };

  return (
    <div className='space-y-8'>
      <div className='flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between'>
        <Tabs value={mediaType} onValueChange={(value) => setMediaType(value as MediaType)}>
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

        <div className='flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center'>
          <div className='relative w-full md:w-[320px]'>
            <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500' />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={t('searchPlaceholder')}
              title={t('searchHint')}
              aria-label={t('searchAria')}
              className='h-9 rounded-full border-zinc-200 bg-white/70 pl-9 pr-9 text-sm dark:border-zinc-800 dark:bg-zinc-900/70'
            />
            {keyword ? (
              <Button
                type='button'
                size='icon'
                variant='ghost'
                className='absolute right-1 top-1 h-7 w-7 rounded-full'
                aria-label={t('clearSearch')}
                onClick={clearKeyword}
              >
                <X className='h-4 w-4' />
              </Button>
            ) : null}
          </div>

          <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrder)}>
            <SelectTrigger className='h-9 w-auto min-w-[120px] rounded-full border border-zinc-200 bg-white/50 px-4 text-xs backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/50'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='newest' className='text-xs'>{t('filters.newest')}</SelectItem>
              <SelectItem value='oldest' className='text-xs'>{t('filters.oldest')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isFiltering ? (
        <GallerySkeleton />
      ) : items.length === 0 ? (
        <div className='rounded-2xl border border-zinc-200 bg-white/60 p-10 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300'>
          {t('noResults')}
        </div>
      ) : (
        <GalleryInfinite
          initialItems={items}
          initialCursor={cursor}
          pageSize={pageSize}
          hasNext={hasNext}
          mediaType={mediaType}
          sortOrder={sortOrder}
          keyword={normalizedKeyword}
          selectedId={selectedId}
          onSelectedIdChange={handleSelectedIdChange}
        />
      )}
    </div>
  );
}
