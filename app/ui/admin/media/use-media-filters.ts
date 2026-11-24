'use client';

import { useCallback, useMemo, useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import type { MediaLibrarySort } from '@/app/lib/data';

export type PublishedValue = 'all' | 'published' | 'unpublished';
export type MediaTypeValue = 'all' | 'image' | 'video' | 'animated';
export type HeroValue = 'all' | 'yes' | 'no';
export type OrientationValue = 'all' | 'landscape' | 'portrait' | 'square';
export type HasGpsValue = 'all' | 'yes' | 'no';

export type FilterKey =
  | 'q'
  | 'category'
  | 'storageId'
  | 'status'
  | 'type'
  | 'dateFrom'
  | 'dateTo'
  | 'hero'
  | 'orientation'
  | 'camera'
  | 'lens'
  | 'hasGps'
  | 'sort';

export type MediaFilters = {
  q: string;
  category: string;
  storageId: number | null;
  status: PublishedValue;
  type: MediaTypeValue;
  dateFrom: string;
  dateTo: string;
  hero: HeroValue;
  orientation: OrientationValue;
  camera: string;
  lens: string;
  hasGps: HasGpsValue;
  sort: MediaLibrarySort;
};

const VALID_SORTS: readonly MediaLibrarySort[] = [
  'dateShotDesc',
  'dateShotAsc',
  'sizeDesc',
  'sizeAsc',
  'resolutionDesc',
  'resolutionAsc',
  'titleAsc',
  'titleDesc',
];

const FILTER_KEYS: FilterKey[] = [
  'q',
  'category',
  'storageId',
  'status',
  'type',
  'dateFrom',
  'dateTo',
  'hero',
  'orientation',
  'camera',
  'lens',
  'hasGps',
  'sort',
];

export function useMediaFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const filters = useMemo<MediaFilters>(() => {
    const storageRaw = searchParams.get('storageId');
    const sortRaw = searchParams.get('sort') as MediaLibrarySort | null;

    return {
      q: searchParams.get('q') || '',
      category: searchParams.get('category') || 'all',
      storageId: storageRaw ? Number(storageRaw) : null,
      status: (searchParams.get('status') as PublishedValue) || 'all',
      type: (searchParams.get('type') as MediaTypeValue) || 'all',
      dateFrom: searchParams.get('dateFrom') || '',
      dateTo: searchParams.get('dateTo') || '',
      hero: (searchParams.get('hero') as HeroValue) || 'all',
      orientation: (searchParams.get('orientation') as OrientationValue) || 'all',
      camera: searchParams.get('camera') || '',
      lens: searchParams.get('lens') || '',
      hasGps: (searchParams.get('hasGps') as HasGpsValue) || 'all',
      sort: sortRaw && VALID_SORTS.includes(sortRaw) ? sortRaw : 'dateShotDesc',
    };
  }, [searchParams]);

  const patchFilters = useCallback(
    (patch: Partial<MediaFilters>) => {
      const params = new URLSearchParams(searchParams.toString());

      const next: MediaFilters = {
        ...filters,
        ...patch,
      };

      if (patch.category && patch.category !== filters.category) {
        next.storageId = null;
      }

      const setOrDelete = (key: string, value: string | null | undefined, defaultValue?: string) => {
        if (value && value !== defaultValue) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      };

      setOrDelete('q', next.q);
      setOrDelete('category', next.category, 'all');
      setOrDelete('storageId', next.storageId ? String(next.storageId) : null);
      setOrDelete('status', next.status, 'all');
      setOrDelete('type', next.type, 'all');
      setOrDelete('dateFrom', next.dateFrom);
      setOrDelete('dateTo', next.dateTo);
      setOrDelete('hero', next.hero, 'all');
      setOrDelete('orientation', next.orientation, 'all');
      setOrDelete('camera', next.camera);
      setOrDelete('lens', next.lens);
      setOrDelete('hasGps', next.hasGps, 'all');
      setOrDelete('sort', next.sort, 'dateShotDesc');

      params.delete('page');

      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname);
      });
    },
    [filters, pathname, router, searchParams],
  );

  const clearAll = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    FILTER_KEYS.forEach((key) => params.delete(key));
    params.delete('page');

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname);
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
        orientation: 'all',
        camera: '',
        lens: '',
        hasGps: 'all',
        sort: 'dateShotDesc',
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
