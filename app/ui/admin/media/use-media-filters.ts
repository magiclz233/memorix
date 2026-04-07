'use client';

import { useCallback, useMemo, useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';

export type PublishedValue = 'all' | 'published' | 'unpublished';
export type MediaTypeValue = 'all' | 'image' | 'video' | 'animated';
export type HeroValue = 'all' | 'yes' | 'no';

export type FilterKey =
  | 'q'
  | 'category'
  | 'storageId'
  | 'status'
  | 'type'
  | 'dateFrom'
  | 'dateTo'
  | 'hero';

export type MediaFilters = {
  q: string;
  category: string;
  storageId: number | null;
  status: PublishedValue;
  type: MediaTypeValue;
  dateFrom: string;
  dateTo: string;
  hero: HeroValue;
};

const FILTER_KEYS: FilterKey[] = [
  'q',
  'category',
  'storageId',
  'status',
  'type',
  'dateFrom',
  'dateTo',
  'hero',
];

export function useMediaFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const filters = useMemo<MediaFilters>(() => {
    const storageRaw = searchParams.get('storageId');

    return {
      q: searchParams.get('q') || '',
      category: searchParams.get('category') || 'all',
      storageId: storageRaw ? Number(storageRaw) : null,
      status: (searchParams.get('status') as PublishedValue) || 'all',
      type: (searchParams.get('type') as MediaTypeValue) || 'all',
      dateFrom: searchParams.get('dateFrom') || '',
      dateTo: searchParams.get('dateTo') || '',
      hero: (searchParams.get('hero') as HeroValue) || 'all',
    };
  }, [searchParams]);

  const patchFilters = useCallback(
    (patch: Partial<MediaFilters>) => {
      const params = new URLSearchParams(searchParams.toString());

      const next = {
        ...filters,
        ...patch,
      };

      if (patch.category && patch.category !== filters.category) {
        next.storageId = null;
      }

      if (next.q) params.set('q', next.q);
      else params.delete('q');

      if (next.category !== 'all') params.set('category', next.category);
      else params.delete('category');

      if (next.storageId) params.set('storageId', String(next.storageId));
      else params.delete('storageId');

      if (next.status !== 'all') params.set('status', next.status);
      else params.delete('status');

      if (next.type !== 'all') params.set('type', next.type);
      else params.delete('type');

      if (next.dateFrom) params.set('dateFrom', next.dateFrom);
      else params.delete('dateFrom');

      if (next.dateTo) params.set('dateTo', next.dateTo);
      else params.delete('dateTo');

      if (next.hero !== 'all') params.set('hero', next.hero);
      else params.delete('hero');

      params.delete('page');

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    },
    [filters, pathname, router, searchParams],
  );

  const clearAll = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    FILTER_KEYS.forEach((key) => params.delete(key));
    params.delete('page');

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }, [pathname, router, searchParams]);

  const removeFilter = useCallback(
    (key: FilterKey) => {
      const resetMap: Partial<MediaFilters> = {
        q: '',
        category: 'all',
        storageId: null,
        status: 'all',
        type: 'all',
        dateFrom: '',
        dateTo: '',
        hero: 'all',
      };

      patchFilters({ [key]: resetMap[key] } as Partial<MediaFilters>);
    },
    [patchFilters],
  );

  return {
    filters,
    isPending,
    patchFilters,
    clearAll,
    removeFilter,
  };
}
