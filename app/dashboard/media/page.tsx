import Link from 'next/link';
import { PlayCircle } from 'lucide-react';

import { fetchMediaPage, MEDIA_KINDS, MEDIA_SOURCES, type MediaItem, type MediaKind, type MediaSource } from '@/app/lib/media-data';
import { generatePagination } from '@/app/lib/utils';
import { Button } from '@/components/ui/button';

type PageProps = {
  searchParams?: Promise<{
    page?: string;
    source?: string;
    type?: string;
    view?: string;
  }>;
};

const ITEMS_PER_PAGE = 15;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(
    new Date(value),
  );

const formatMonth = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' }).format(
    new Date(value),
  );

const groupByMonth = (items: MediaItem[]) => {
  const groups = new Map<string, MediaItem[]>();
  items.forEach((item) => {
    const key = formatMonth(item.createdAt);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  });
  return Array.from(groups.entries());
};

const MediaCard = ({ item }: { item: MediaItem }) => {
  const ratio = (item.height / item.width) * 100;
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/80 p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
      <div
        className="relative w-full overflow-hidden rounded-xl"
        style={{ paddingTop: `${ratio}%` }}
      >
        <img
          src={item.thumb}
          alt={item.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {item.kind === 'video' ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
            <PlayCircle className="h-8 w-8" />
          </div>
        ) : null}
      </div>
      <div className="mt-3 space-y-1 px-1 pb-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {item.title}
          </p>
          <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            {item.kind === 'video' ? '视频' : '图片'}
          </span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {item.source} · {formatDate(item.createdAt)}
        </p>
      </div>
    </div>
  );
};

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const page = Number(resolvedSearchParams?.page ?? 1);
  const sourceParam = resolvedSearchParams?.source ?? 'all';
  const typeParam = resolvedSearchParams?.type ?? 'all';
  const view = resolvedSearchParams?.view === 'timeline' ? 'timeline' : 'masonry';

  const source = MEDIA_SOURCES.includes(sourceParam as MediaSource)
    ? (sourceParam as MediaSource)
    : 'all';
  const kind = MEDIA_KINDS.includes(typeParam as MediaKind)
    ? (typeParam as MediaKind)
    : 'all';

  const { items, totalPages, totalCount, page: safePage } = fetchMediaPage({
    page,
    perPage: ITEMS_PER_PAGE,
    source,
    kind,
  });

  const buildPageUrl = (pageNumber: number | string) => {
    const params = new URLSearchParams();
    if (source !== 'all') params.set('source', source);
    if (kind !== 'all') params.set('type', kind);
    if (view !== 'masonry') params.set('view', view);
    params.set('page', pageNumber.toString());
    return `/dashboard/media?${params.toString()}`;
  };

  const allPages = generatePagination(safePage, totalPages);
  const timelineGroups = view === 'timeline' ? groupByMonth(items) : [];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          资源库概览
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          使用服务器端分页与筛选，避免一次性加载过多资源。
        </p>
      </header>

      <form
        method="get"
        className="sticky top-4 z-20 flex flex-wrap items-center gap-3 rounded-full border border-zinc-200 bg-white/80 px-4 py-2 text-sm shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-black/40"
      >
        <label className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
          <span>存储来源</span>
          <select
            name="source"
            defaultValue={source}
            className="rounded-full border border-zinc-200 bg-white/80 px-3 py-1 text-sm text-zinc-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
          >
            <option value="all">全部来源</option>
            {MEDIA_SOURCES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
          <span>媒体类型</span>
          <select
            name="type"
            defaultValue={kind}
            className="rounded-full border border-zinc-200 bg-white/80 px-3 py-1 text-sm text-zinc-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
          >
            <option value="all">全部</option>
            {MEDIA_KINDS.map((item) => (
              <option key={item} value={item}>
                {item === 'video' ? '视频' : '图片'}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
          <span>视图</span>
          <select
            name="view"
            defaultValue={view}
            className="rounded-full border border-zinc-200 bg-white/80 px-3 py-1 text-sm text-zinc-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
          >
            <option value="masonry">瀑布流</option>
            <option value="timeline">时光轴</option>
          </select>
        </label>

        <input type="hidden" name="page" value="1" />
        <Button type="submit" size="sm">
          应用筛选
        </Button>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          共 {totalCount} 项
        </span>
      </form>

      {view === 'masonry' ? (
        <div className="columns-1 gap-5 md:columns-2 xl:columns-3">
          {items.map((item) => (
            <div key={item.id} className="mb-5 break-inside-avoid">
              <MediaCard item={item} />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {timelineGroups.map(([month, monthItems]) => (
            <section key={month} className="space-y-4">
              <div className="flex items-center gap-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                <span>{month}</span>
                <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {monthItems.map((item) => (
                  <MediaCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

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
    </div>
  );
}
