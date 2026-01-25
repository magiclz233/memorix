import { Link } from '@/i18n/navigation';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import {
  fetchHeroPhotoIdsByUser,
  fetchMediaLibraryPage,
  fetchUserByEmail,
  fetchUserStorages,
  type MediaLibrarySort,
} from '@/app/lib/data';
import { generatePagination } from '@/app/lib/utils';
import { MediaLibraryManager } from '@/app/ui/admin/media/media-library';
import { MediaFilterBar } from '@/app/ui/admin/media/media-filter-bar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getTranslations } from 'next-intl/server';

type PageProps = {
  searchParams?: Promise<{
    page?: string;
    storageId?: string | string[];
    type?: string;
    status?: string;
    q?: string;
    dateFrom?: string;
    dateTo?: string;
    sizeMin?: string;
    sizeMax?: string;
    widthMin?: string;
    widthMax?: string;
    heightMin?: string;
    heightMax?: string;
    exposureMin?: string;
    exposureMax?: string;
    apertureMin?: string;
    apertureMax?: string;
    isoMin?: string;
    isoMax?: string;
    focalLengthMin?: string;
    focalLengthMax?: string;
    orientation?: string;
    camera?: string;
    maker?: string;
    lens?: string;
    hasGps?: string;
    sort?: string;
    category?: string;
    limit?: string;
  }>;
};

const parseStringArray = (value?: string | string[]) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value.includes(',')) return value.split(',').map((item) => item.trim());
  return [value];
};

const parseNumber = (value?: string | string[]) => {
  if (!value) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

export default async function Page({ searchParams }: PageProps) {
  const t = await getTranslations('dashboard.media');
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const email = session?.user?.email ?? null;

  if (!email) {
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t('title')}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t('loginRequired')}
        </p>
        <Button asChild variant="outline">
          <Link href="/login">{t('goToLogin')}</Link>
        </Button>
      </main>
    );
  }

  const user = await fetchUserByEmail(email);
  if (!user) {
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t('title')}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('userNotFound')}</p>
      </main>
    );
  }

  const STORAGE_LABELS: Record<string, string> = {
    local: t('storageLabels.local'),
    nas: t('storageLabels.nas'),
    s3: t('storageLabels.s3'),
    qiniu: t('storageLabels.qiniu'),
  };

  const SORT_OPTIONS: { value: MediaLibrarySort; label: string }[] = [
    { value: 'dateShotDesc', label: t('sort.dateShotDesc') },
    { value: 'dateShotAsc', label: t('sort.dateShotAsc') },
    { value: 'sizeDesc', label: t('sort.sizeDesc') },
    { value: 'sizeAsc', label: t('sort.sizeAsc') },
    { value: 'resolutionDesc', label: t('sort.resolutionDesc') },
    { value: 'resolutionAsc', label: t('sort.resolutionAsc') },
    { value: 'titleAsc', label: t('sort.titleAsc') },
    { value: 'titleDesc', label: t('sort.titleDesc') },
  ];

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const page = parseNumber(resolvedSearchParams?.page ?? '1') ?? 1;
  const perPage = parseNumber(resolvedSearchParams?.limit) ?? 24;
  const selectedStorageIds = parseStringArray(resolvedSearchParams?.storageId)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
  const mediaType =
    resolvedSearchParams?.type === 'image' || resolvedSearchParams?.type === 'video'
      ? resolvedSearchParams.type
      : 'all';
  const publishStatus =
    resolvedSearchParams?.status === 'published' ||
    resolvedSearchParams?.status === 'unpublished'
      ? resolvedSearchParams.status
      : 'all';
  const orientation =
    resolvedSearchParams?.orientation === 'landscape' ||
    resolvedSearchParams?.orientation === 'portrait' ||
    resolvedSearchParams?.orientation === 'square'
      ? resolvedSearchParams.orientation
      : 'all';
  const hasGps =
    resolvedSearchParams?.hasGps === 'yes' || resolvedSearchParams?.hasGps === 'no'
      ? resolvedSearchParams.hasGps
      : 'all';
  const sort = SORT_OPTIONS.some((option) => option.value === resolvedSearchParams?.sort)
    ? (resolvedSearchParams?.sort as MediaLibrarySort)
    : 'dateShotDesc';

  const sizeMinMb = parseNumber(resolvedSearchParams?.sizeMin);
  const sizeMaxMb = parseNumber(resolvedSearchParams?.sizeMax);
  const storages = await fetchUserStorages(user.id);
  const heroIds = await fetchHeroPhotoIdsByUser(user.id);

  // Helper to get storage IDs by category
  const getStorageIdsByCategory = (category: string) => {
    if (category === 'all') return [];
    return storages
      .filter((s) => s.type === category)
      .map((s) => s.id);
  };

  const category = resolvedSearchParams?.category ?? 'all';
  
  // If storageId is provided, use it. 
  // If not, but category is provided (and not 'all'), use all storage IDs in that category.
  let finalStorageIds = selectedStorageIds;
  if (finalStorageIds.length === 0 && category !== 'all') {
    finalStorageIds = getStorageIdsByCategory(category);
  }

  const { items, totalPages, totalCount, page: safePage } = await fetchMediaLibraryPage({
    userId: user.id,
    page,
    perPage,
    filters: {
      storageIds: finalStorageIds,
      mediaType,
      publishStatus,
      keyword: resolvedSearchParams?.q,
      dateFrom: resolvedSearchParams?.dateFrom,
      dateTo: resolvedSearchParams?.dateTo,
      sizeMin:
        typeof sizeMinMb === 'number' ? Math.round(sizeMinMb * 1024 * 1024) : undefined,
      sizeMax:
        typeof sizeMaxMb === 'number' ? Math.round(sizeMaxMb * 1024 * 1024) : undefined,
      widthMin: parseNumber(resolvedSearchParams?.widthMin) ?? undefined,
      widthMax: parseNumber(resolvedSearchParams?.widthMax) ?? undefined,
      heightMin: parseNumber(resolvedSearchParams?.heightMin) ?? undefined,
      heightMax: parseNumber(resolvedSearchParams?.heightMax) ?? undefined,
      exposureMin: parseNumber(resolvedSearchParams?.exposureMin) ?? undefined,
      exposureMax: parseNumber(resolvedSearchParams?.exposureMax) ?? undefined,
      apertureMin: parseNumber(resolvedSearchParams?.apertureMin) ?? undefined,
      apertureMax: parseNumber(resolvedSearchParams?.apertureMax) ?? undefined,
      isoMin: parseNumber(resolvedSearchParams?.isoMin) ?? undefined,
      isoMax: parseNumber(resolvedSearchParams?.isoMax) ?? undefined,
      focalLengthMin: parseNumber(resolvedSearchParams?.focalLengthMin) ?? undefined,
      focalLengthMax: parseNumber(resolvedSearchParams?.focalLengthMax) ?? undefined,
      orientation,
      camera: resolvedSearchParams?.camera,
      maker: resolvedSearchParams?.maker,
      lens: resolvedSearchParams?.lens,
      hasGps,
      sort,
    },
  });

  const hasFilters = Boolean(
    selectedStorageIds.length ||
      category !== 'all' ||
      mediaType !== 'all' ||
      publishStatus !== 'all' ||
      resolvedSearchParams?.q ||
      resolvedSearchParams?.dateFrom ||
      resolvedSearchParams?.dateTo ||
      resolvedSearchParams?.sizeMin ||
      resolvedSearchParams?.sizeMax ||
      resolvedSearchParams?.widthMin ||
      resolvedSearchParams?.widthMax ||
      resolvedSearchParams?.heightMin ||
      resolvedSearchParams?.heightMax ||
      resolvedSearchParams?.exposureMin ||
      resolvedSearchParams?.exposureMax ||
      resolvedSearchParams?.apertureMin ||
      resolvedSearchParams?.apertureMax ||
      resolvedSearchParams?.isoMin ||
      resolvedSearchParams?.isoMax ||
      resolvedSearchParams?.focalLengthMin ||
      resolvedSearchParams?.focalLengthMax ||
      orientation !== 'all' ||
      resolvedSearchParams?.camera ||
      resolvedSearchParams?.maker ||
      resolvedSearchParams?.lens ||
      hasGps !== 'all' ||
      sort !== 'dateShotDesc',
  );

  const buildPageUrl = (pageNumber: number | string) => {
    const params = new URLSearchParams();
    selectedStorageIds.forEach((id) => params.append('storageId', String(id)));
    if (category !== 'all') params.set('category', category);
    if (mediaType !== 'all') params.set('type', mediaType);
    if (publishStatus !== 'all') params.set('status', publishStatus);
    if (resolvedSearchParams?.q) params.set('q', resolvedSearchParams.q);
    if (resolvedSearchParams?.dateFrom) params.set('dateFrom', resolvedSearchParams.dateFrom);
    if (resolvedSearchParams?.dateTo) params.set('dateTo', resolvedSearchParams.dateTo);
    if (resolvedSearchParams?.sizeMin) params.set('sizeMin', resolvedSearchParams.sizeMin);
    if (resolvedSearchParams?.sizeMax) params.set('sizeMax', resolvedSearchParams.sizeMax);
    if (resolvedSearchParams?.widthMin) params.set('widthMin', resolvedSearchParams.widthMin);
    if (resolvedSearchParams?.widthMax) params.set('widthMax', resolvedSearchParams.widthMax);
    if (resolvedSearchParams?.heightMin) params.set('heightMin', resolvedSearchParams.heightMin);
    if (resolvedSearchParams?.heightMax) params.set('heightMax', resolvedSearchParams.heightMax);
    if (resolvedSearchParams?.exposureMin) params.set('exposureMin', resolvedSearchParams.exposureMin);
    if (resolvedSearchParams?.exposureMax) params.set('exposureMax', resolvedSearchParams.exposureMax);
    if (resolvedSearchParams?.apertureMin) params.set('apertureMin', resolvedSearchParams.apertureMin);
    if (resolvedSearchParams?.apertureMax) params.set('apertureMax', resolvedSearchParams.apertureMax);
    if (resolvedSearchParams?.isoMin) params.set('isoMin', resolvedSearchParams.isoMin);
    if (resolvedSearchParams?.isoMax) params.set('isoMax', resolvedSearchParams.isoMax);
    if (resolvedSearchParams?.focalLengthMin) params.set('focalLengthMin', resolvedSearchParams.focalLengthMin);
    if (resolvedSearchParams?.focalLengthMax) params.set('focalLengthMax', resolvedSearchParams.focalLengthMax);
    if (orientation !== 'all') params.set('orientation', orientation);
    if (resolvedSearchParams?.camera) params.set('camera', resolvedSearchParams.camera);
    if (resolvedSearchParams?.maker) params.set('maker', resolvedSearchParams.maker);
    if (resolvedSearchParams?.lens) params.set('lens', resolvedSearchParams.lens);
    if (hasGps !== 'all') params.set('hasGps', hasGps);
    if (sort !== 'dateShotDesc') params.set('sort', sort);
    params.set('page', pageNumber.toString());
    return `/dashboard/media?${params.toString()}`;
  };

  const allPages = generatePagination(safePage, totalPages);

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t('title')}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t('description')}
        </p>
      </header>

      <MediaFilterBar />

      {totalCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/70 p-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
          {hasFilters
            ? t('empty.noMatches')
            : t('empty.noContent')}
          <div className="mt-4 flex justify-center gap-3">
            {hasFilters ? (
              <Button asChild variant="ghost">
                <Link href="/dashboard/media">{t('filters.clear')}</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/dashboard/storage">{t('empty.goToStorage')}</Link>
            </Button>
          </div>
        </div>
      ) : (
        <MediaLibraryManager
          items={items}
          heroIds={heroIds}
          totalCount={totalCount}
          storages={storages}
        />
      )}

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <span className="text-zinc-500 dark:text-zinc-400">
            {t('pagination', { current: safePage, total: totalPages })}
          </span>
          <div className="flex items-center gap-2">
            {allPages.map((pageItem, index) => {
              const isActive = pageItem === safePage;
              const isEllipsis = pageItem === '...';
              return (
                <span key={`${pageItem}-${index}`}>
                  {isEllipsis ? (
                    <span className="px-2 text-zinc-400">...</span>
                  ) : (
                    <Button
                      asChild
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                    >
                      <Link href={buildPageUrl(pageItem)}>{pageItem}</Link>
                    </Button>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}
    </main>
  );
}
