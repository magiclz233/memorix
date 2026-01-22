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
    orientation?: string;
    camera?: string;
    maker?: string;
    lens?: string;
    hasGps?: string;
    sort?: string;
  }>;
};

const ITEMS_PER_PAGE = 24;

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
  const { items, totalPages, totalCount, page: safePage } = await fetchMediaLibraryPage({
    userId: user.id,
    page,
    perPage: ITEMS_PER_PAGE,
    filters: {
      storageIds: selectedStorageIds,
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

      <form
        method="get"
        className="space-y-4 rounded-2xl border border-zinc-200 bg-white/80 p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60"
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            name="q"
            defaultValue={resolvedSearchParams?.q ?? ''}
            placeholder={t('filters.searchPlaceholder')}
            className="min-w-[220px] flex-1 rounded-full border border-zinc-200 bg-white/80 px-4 py-2 text-sm text-zinc-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
          />
          <select
            name="type"
            defaultValue={mediaType}
            className="rounded-full border border-zinc-200 bg-white/80 px-3 py-2 text-sm text-zinc-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
          >
            <option value="all">{t('filters.type.all')}</option>
            <option value="image">{t('filters.type.image')}</option>
            <option value="video">{t('filters.type.video')}</option>
          </select>
          <select
            name="status"
            defaultValue={publishStatus}
            className="rounded-full border border-zinc-200 bg-white/80 px-3 py-2 text-sm text-zinc-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
          >
            <option value="all">{t('filters.status.all')}</option>
            <option value="published">{t('filters.status.published')}</option>
            <option value="unpublished">{t('filters.status.unpublished')}</option>
          </select>
          <select
            name="sort"
            defaultValue={sort}
            className="rounded-full border border-zinc-200 bg-white/80 px-3 py-2 text-sm text-zinc-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input type="hidden" name="page" value="1" />
          <Button type="submit" size="sm">
            {t('filters.apply')}
          </Button>
          {hasFilters ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/media">{t('filters.clear')}</Link>
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{t('filters.source')}</span>
          {storages.map((storage) => {
            const config = (storage.config ?? {}) as { alias?: string | null; isDisabled?: boolean };
            const label =
              config.alias?.trim() ||
              STORAGE_LABELS[storage.type] ||
              storage.type.toUpperCase();
            const isChecked = selectedStorageIds.includes(storage.id);
            return (
              <label
                key={storage.id}
                className={cn(
                  'relative cursor-pointer rounded-full border px-3 py-1 text-xs transition',
                  isChecked
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                    : 'border-zinc-200 text-zinc-600 hover:border-indigo-300 dark:border-zinc-700 dark:text-zinc-300',
                  config.isDisabled && 'opacity-70',
                )}
              >
                <input
                  type="checkbox"
                  name="storageId"
                  value={storage.id}
                  defaultChecked={isChecked}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                {label}
                {config.isDisabled ? t('filters.disabled') : ''}
              </label>
            );
          })}
        </div>

        <details className="rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
          <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-200">
            {t('filters.advanced')}
          </summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">{t('filters.dateShot')}</p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  name="dateFrom"
                  defaultValue={resolvedSearchParams?.dateFrom ?? ''}
                  className="w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
                />
                <span className="text-xs text-zinc-400">{t('filters.to')}</span>
                <input
                  type="date"
                  name="dateTo"
                  defaultValue={resolvedSearchParams?.dateTo ?? ''}
                  className="w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
                />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">{t('filters.size')}</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  name="sizeMin"
                  defaultValue={resolvedSearchParams?.sizeMin ?? ''}
                  placeholder={t('filters.min')}
                  className="w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
                />
                <span className="text-xs text-zinc-400">{t('filters.to')}</span>
                <input
                  type="number"
                  min="0"
                  name="sizeMax"
                  defaultValue={resolvedSearchParams?.sizeMax ?? ''}
                  placeholder={t('filters.max')}
                  className="w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
                />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">{t('filters.resolutionWidth')}</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  name="widthMin"
                  defaultValue={resolvedSearchParams?.widthMin ?? ''}
                  placeholder={t('filters.min')}
                  className="w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
                />
                <span className="text-xs text-zinc-400">{t('filters.to')}</span>
                <input
                  type="number"
                  min="0"
                  name="widthMax"
                  defaultValue={resolvedSearchParams?.widthMax ?? ''}
                  placeholder={t('filters.max')}
                  className="w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
                />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">{t('filters.resolutionHeight')}</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  name="heightMin"
                  defaultValue={resolvedSearchParams?.heightMin ?? ''}
                  placeholder={t('filters.min')}
                  className="w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
                />
                <span className="text-xs text-zinc-400">{t('filters.to')}</span>
                <input
                  type="number"
                  min="0"
                  name="heightMax"
                  defaultValue={resolvedSearchParams?.heightMax ?? ''}
                  placeholder={t('filters.max')}
                  className="w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
                />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">{t('filters.orientation.label')}</p>
              <select
                name="orientation"
                defaultValue={orientation}
                className="w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
              >
                <option value="all">{t('filters.orientation.all')}</option>
                <option value="landscape">{t('filters.orientation.landscape')}</option>
                <option value="portrait">{t('filters.orientation.portrait')}</option>
                <option value="square">{t('filters.orientation.square')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">{t('filters.gps.label')}</p>
              <select
                name="hasGps"
                defaultValue={hasGps}
                className="w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
              >
                <option value="all">{t('filters.gps.all')}</option>
                <option value="yes">{t('filters.gps.yes')}</option>
                <option value="no">{t('filters.gps.no')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">{t('filters.camera')}</p>
              <input
                type="text"
                name="camera"
                defaultValue={resolvedSearchParams?.camera ?? ''}
                placeholder={t('filters.example', { value: 'Sony' })}
                className="w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">{t('filters.maker')}</p>
              <input
                type="text"
                name="maker"
                defaultValue={resolvedSearchParams?.maker ?? ''}
                placeholder={t('filters.example', { value: 'Canon' })}
                className="w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">{t('filters.lens')}</p>
              <input
                type="text"
                name="lens"
                defaultValue={resolvedSearchParams?.lens ?? ''}
                placeholder={t('filters.example', { value: '24-70mm' })}
                className="w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
              />
            </div>
          </div>
        </details>
      </form>

      <div className="rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
        {t('disabledWarning')}
      </div>

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
        <MediaLibraryManager items={items} heroIds={heroIds} totalCount={totalCount} />
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