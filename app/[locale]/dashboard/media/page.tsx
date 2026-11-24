import { Link } from '@/i18n/navigation';
import { HardDrive, UploadCloud } from 'lucide-react';
import { getRequestSession } from '@/app/lib/auth-session';
import {
  fetchCollections,
  fetchHeroPhotoIdsByUser,
  fetchMediaLibraryPage,
  fetchUserStorages,
  type MediaLibrarySort,
} from '@/app/lib/data';
import { getSessionUserId } from '@/app/lib/session-user';
import { parsePageNumber, resolveListPageSize } from '@/app/lib/list-view';
import { AdminPageHeader } from '@/app/ui/admin/shared/admin-page-header';
import { MediaLibraryManager } from '@/app/ui/admin/media/media-library';
import { ServerListPagination } from '@/app/ui/shared/list-pagination';
import { Button } from '@/components/ui/button';
import { getTranslations } from 'next-intl/server';

type PageProps = {
  searchParams?: Promise<{
    page?: string;
    storageId?: string | string[];
    type?: string;
    status?: string;
    hero?: string;
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
  const session = await getRequestSession();
  const userId = getSessionUserId(session);

  if (!userId) {
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
  const page = parsePageNumber(resolvedSearchParams?.page);
  const perPage = resolveListPageSize(resolvedSearchParams?.limit);
  const selectedStorageIds = parseStringArray(resolvedSearchParams?.storageId)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
  const mediaType =
    resolvedSearchParams?.type === 'image' ||
    resolvedSearchParams?.type === 'video' ||
    resolvedSearchParams?.type === 'animated'
      ? resolvedSearchParams.type
      : 'all';
  const publishStatus =
    resolvedSearchParams?.status === 'published' ||
    resolvedSearchParams?.status === 'unpublished'
      ? resolvedSearchParams.status
      : 'all';
  const hero =
    resolvedSearchParams?.hero === 'yes' || resolvedSearchParams?.hero === 'no'
      ? resolvedSearchParams.hero
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
  const [storages, heroIds, rawCollections] = await Promise.all([
    fetchUserStorages(userId),
    fetchHeroPhotoIdsByUser(userId),
    fetchCollections({ status: 'all' }),
  ]);
  const collectionOptions = rawCollections.map((c) => ({
    id: c.id,
    title: c.title,
    type: c.type as 'mixed' | 'photo' | 'video',
  }));

  // Helper to get storage IDs by category
  const getStorageIdsByCategory = (category: string) => {
    if (category === 'all') return [];
    return storages
      .filter((s) => s.type === category)
      .map((s) => s.id);
  };

  const category = resolvedSearchParams?.category ?? 'all';
  
  // 区分「不限存储源（undefined）」与「选了某分类但该分类下暂无实例（[]）」：
  // 传 undefined 表示不加存储源过滤；传 [] 会短路返回 0 条而非误返回全库。
  const finalStorageIds =
    selectedStorageIds.length > 0
      ? selectedStorageIds
      : category !== 'all'
        ? getStorageIdsByCategory(category)
        : undefined;

  const { items, totalPages, totalCount, page: safePage } = await fetchMediaLibraryPage({
    userId,
    page,
    perPage,
    heroIds,
    filters: {
      storageIds: finalStorageIds,
      mediaType,
      publishStatus,
      hero,
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
      hero !== 'all' ||
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

  return (
    <main className="space-y-6 pb-24">
      <AdminPageHeader
        title={t('title')}
        description={t('description')}
        meta={
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-mono text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {t('library.totalCount', { count: totalCount })}
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/storage">
                <HardDrive className="h-4 w-4" />
                <span>{t('empty.goToStorage')}</span>
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
              <Link href="/dashboard/upload/create">
                <UploadCloud className="h-4 w-4" />
                <span>{t('library.uploadAction')}</span>
              </Link>
            </Button>
          </>
        }
      />

      <MediaLibraryManager
        items={items}
        heroIds={heroIds}
        totalCount={totalCount}
        storages={storages}
        collections={collectionOptions}
        hasFilters={hasFilters}
      />

      {totalCount > 0 ? (
        <ServerListPagination
          page={safePage}
          totalPages={totalPages}
          pageSize={perPage}
          totalCount={totalCount}
        />
      ) : null}
    </main>
  );
}
