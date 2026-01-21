import Link from 'next/link';
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

const STORAGE_LABELS: Record<string, string> = {
  local: '本地存储',
  nas: 'NAS 存储',
  s3: 'S3 兼容',
  qiniu: '七牛云',
};

const SORT_OPTIONS: { value: MediaLibrarySort; label: string }[] = [
  { value: 'dateShotDesc', label: '拍摄时间（最新）' },
  { value: 'dateShotAsc', label: '拍摄时间（最早）' },
  { value: 'sizeDesc', label: '文件大小（大到小）' },
  { value: 'sizeAsc', label: '文件大小（小到大）' },
  { value: 'resolutionDesc', label: '分辨率（高到低）' },
  { value: 'resolutionAsc', label: '分辨率（低到高）' },
  { value: 'titleAsc', label: '标题（A-Z）' },
  { value: 'titleDesc', label: '标题（Z-A）' },
];

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
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const email = session?.user?.email ?? null;

  if (!email) {
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          资源库
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          请先登录后再管理资源库。
        </p>
        <Button asChild variant="outline">
          <Link href="/login">前往登录</Link>
        </Button>
      </main>
    );
  }

  const user = await fetchUserByEmail(email);
  if (!user) {
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          资源库
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">未找到用户信息。</p>
      </main>
    );
  }

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
          资源库
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          资源库仅负责展示与发布，扫描操作请前往存储配置。
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
            placeholder="搜索标题 / 路径 / 描述"
            className="min-w-[220px] flex-1 rounded-full border border-zinc-200 bg-white/80 px-4 py-2 text-sm text-zinc-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
          />
          <select
            name="type"
            defaultValue={mediaType}
            className="rounded-full border border-zinc-200 bg-white/80 px-3 py-2 text-sm text-zinc-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
          >
            <option value="all">全部类型</option>
            <option value="image">图片</option>
            <option value="video">视频</option>
          </select>
          <select
            name="status"
            defaultValue={publishStatus}
            className="rounded-full border border-zinc-200 bg-white/80 px-3 py-2 text-sm text-zinc-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
          >
            <option value="all">全部状态</option>
            <option value="published">已发布</option>
            <option value="unpublished">未发布</option>
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
            应用筛选
          </Button>
          {hasFilters ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/media">清空筛选</Link>
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">来源筛选</span>
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
                {config.isDisabled ? '（已禁用）' : ''}
              </label>
            );
          })}
        </div>

        <details className="rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
          <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-200">
            高级筛选
          </summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">拍摄时间</p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  name="dateFrom"
                  defaultValue={resolvedSearchParams?.dateFrom ?? ''}
                  className="w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
                />
                <span className="text-xs text-zinc-400">至</span>
                <input
                  type="date"
                  name="dateTo"
                  defaultValue={resolvedSearchParams?.dateTo ?? ''}
                  className="w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
                />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">文件大小（MB）</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  name="sizeMin"
                  defaultValue={resolvedSearchParams?.sizeMin ?? ''}
                  placeholder="最小"
                  className="w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
                />
                <span className="text-xs text-zinc-400">至</span>
                <input
                  type="number"
                  min="0"
                  name="sizeMax"
                  defaultValue={resolvedSearchParams?.sizeMax ?? ''}
                  placeholder="最大"
                  className="w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
                />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">分辨率宽度</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  name="widthMin"
                  defaultValue={resolvedSearchParams?.widthMin ?? ''}
                  placeholder="最小"
                  className="w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
                />
                <span className="text-xs text-zinc-400">至</span>
                <input
                  type="number"
                  min="0"
                  name="widthMax"
                  defaultValue={resolvedSearchParams?.widthMax ?? ''}
                  placeholder="最大"
                  className="w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
                />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">分辨率高度</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  name="heightMin"
                  defaultValue={resolvedSearchParams?.heightMin ?? ''}
                  placeholder="最小"
                  className="w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
                />
                <span className="text-xs text-zinc-400">至</span>
                <input
                  type="number"
                  min="0"
                  name="heightMax"
                  defaultValue={resolvedSearchParams?.heightMax ?? ''}
                  placeholder="最大"
                  className="w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
                />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">画面方向</p>
              <select
                name="orientation"
                defaultValue={orientation}
                className="w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
              >
                <option value="all">全部</option>
                <option value="landscape">横幅</option>
                <option value="portrait">竖幅</option>
                <option value="square">方形</option>
              </select>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">GPS</p>
              <select
                name="hasGps"
                defaultValue={hasGps}
                className="w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
              >
                <option value="all">全部</option>
                <option value="yes">有 GPS</option>
                <option value="no">无 GPS</option>
              </select>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">相机型号</p>
              <input
                type="text"
                name="camera"
                defaultValue={resolvedSearchParams?.camera ?? ''}
                placeholder="例如: Sony"
                className="w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">制造商</p>
              <input
                type="text"
                name="maker"
                defaultValue={resolvedSearchParams?.maker ?? ''}
                placeholder="例如: Canon"
                className="w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">镜头</p>
              <input
                type="text"
                name="lens"
                defaultValue={resolvedSearchParams?.lens ?? ''}
                placeholder="例如: 24-70mm"
                className="w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
              />
            </div>
          </div>
        </details>
      </form>

      <div className="rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
        来源已禁用的资源将以灰度展示，发布操作不可用，请前往存储配置重新启用。
      </div>

      {totalCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/70 p-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
          {hasFilters
            ? '没有符合条件的资源，请调整筛选条件。'
            : '资源库暂无内容，请先在存储配置中完成扫描或同步。'}
          <div className="mt-4 flex justify-center gap-3">
            {hasFilters ? (
              <Button asChild variant="ghost">
                <Link href="/dashboard/media">清空筛选</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/dashboard/storage">前往存储配置</Link>
            </Button>
          </div>
        </div>
      ) : (
        <MediaLibraryManager items={items} heroIds={heroIds} totalCount={totalCount} />
      )}

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <span className="text-zinc-500 dark:text-zinc-400">
            第 {safePage} / {totalPages} 页
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
