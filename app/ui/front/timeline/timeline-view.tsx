'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { CalendarDays, Film, Loader2 } from 'lucide-react';
import type { GalleryItem } from '@/app/lib/gallery';
import { groupTimelineByMonth } from '@/app/lib/timeline-group';
import type { TimelineBucket } from '@/app/lib/data';
import { BlurImage } from '@/app/ui/gallery/blur-image';
import { Gallery25 } from '@/components/gallery25';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/app/ui/components/spinner';
import { cn } from '@/lib/utils';

type Props = {
  buckets: TimelineBucket[];
  initialItems: GalleryItem[];
  initialHasNext: boolean;
  initialCursor: string | null;
  initialYear: number | null;
  initialMonth: number | null;
  pageSize: number;
};

export function TimelineView({
  buckets,
  initialItems,
  initialHasNext,
  initialCursor,
  initialYear,
  initialMonth,
  pageSize,
}: Props) {
  const t = useTranslations('front.timeline');
  const router = useRouter();

  const [year, setYear] = useState<number | null>(initialYear);
  const [month, setMonth] = useState<number | null>(initialMonth);
  const [items, setItems] = useState<GalleryItem[]>(initialItems);
  const [hasNext, setHasNext] = useState(initialHasNext);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [isFiltering, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const years = useMemo(() => {
    const map = new Map<number, number>();
    for (const b of buckets) map.set(b.year, (map.get(b.year) ?? 0) + b.count);
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [buckets]);

  const monthsForYear = useMemo(() => {
    if (!year) return [];
    return buckets.filter((b) => b.year === year).sort((a, b) => b.month - a.month);
  }, [buckets, year]);

  const buildParams = useCallback(
    (nextCursor: string) => {
      const params = new URLSearchParams({
        pageSize: String(pageSize),
        cursor: nextCursor,
      });
      if (year) params.set('year', String(year));
      if (year && month) params.set('month', String(month));
      return params;
    },
    [year, month, pageSize],
  );

  const applyFilter = useCallback(
    (nextYear: number | null, nextMonth: number | null) => {
      const query = new URLSearchParams();
      if (nextYear) query.set('year', String(nextYear));
      if (nextYear && nextMonth) query.set('month', String(nextMonth));
      const qs = query.toString();
      router.replace(qs ? `/timeline?${qs}` : '/timeline', { scroll: false });

      setYear(nextYear);
      setMonth(nextMonth);
      setLoadError(false);
      startTransition(async () => {
        try {
          const params = new URLSearchParams({
            page: '1',
            pageSize: String(pageSize),
          });
          if (nextYear) params.set('year', String(nextYear));
          if (nextYear && nextMonth) params.set('month', String(nextMonth));
          const res = await fetch(`/api/gallery?${params.toString()}`, { cache: 'no-store' });
          if (!res.ok) throw new Error('filter failed');
          const data = (await res.json()) as {
            items: GalleryItem[];
            hasNext: boolean;
            nextCursor: string | null;
          };
          setItems(data.items);
          setHasNext(data.hasNext);
          setCursor(data.nextCursor ?? null);
        } catch {
          setLoadError(true);
        }
      });
    },
    [pageSize, router],
  );

  const selectYear = (nextYear: number | null) => applyFilter(nextYear, null);
  const selectMonth = (nextMonth: number | null) => applyFilter(year, nextMonth);

  const loadMore = useCallback(async () => {
    if (loading || !hasNext || !cursor) return;
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(`/api/gallery?${buildParams(cursor).toString()}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('load failed');
      const data = (await res.json()) as {
        items: GalleryItem[];
        hasNext: boolean;
        nextCursor: string | null;
      };
      setItems((prev) => [...prev, ...data.items]);
      setHasNext(data.hasNext);
      setCursor(data.nextCursor);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [buildParams, cursor, hasNext, loading]);

  useEffect(() => {
    if (!hasNext || loadError || isFiltering) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: '300px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNext, loadError, isFiltering, loadMore]);

  const groups = useMemo(() => groupTimelineByMonth(items), [items]);

  return (
    <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
      {/* 年份轴 */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => selectYear(null)}
            className={cn(
              'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition',
              !year
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
            )}
          >
            <span>{t('allYears')}</span>
          </button>
          {years.map(([y, total]) => (
            <button
              key={y}
              type="button"
              onClick={() => selectYear(y)}
              aria-label={t('jumpToYear', { year: String(y) })}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition',
                year === y
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
              )}
            >
              <span className="font-medium">{t('year', { year: String(y) })}</span>
              <span className="text-xs opacity-60">{total}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* 内容区 */}
      <div className="min-w-0 space-y-8">
        {year ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-4 dark:border-zinc-800">
            <CalendarDays className="h-4 w-4 text-zinc-500" />
            <button
              type="button"
              onClick={() => selectMonth(null)}
              className={cn(
                'rounded-full px-3 py-1 text-xs transition',
                !month
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
              )}
            >
              {t('allMonths')}
            </button>
            {monthsForYear.map((b) => (
              <button
                key={b.month}
                type="button"
                onClick={() => selectMonth(b.month)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs transition',
                  month === b.month
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
                )}
              >
                {t('months.' + String(b.month))} · {b.count}
              </button>
            ))}
          </div>
        ) : null}

        {isFiltering ? (
          <div className="flex items-center justify-center py-20 text-sm text-zinc-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('loading')}
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white/60 p-10 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
            {t('empty')}
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.key} className="space-y-4">
              <div className="flex items-baseline gap-3 border-b border-zinc-200/80 pb-2 dark:border-zinc-800/80">
                <h2 className="font-serif text-2xl font-semibold text-zinc-800 dark:text-white/90">
                  {t('year', { year: String(group.year) })}
                </h2>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {t('months.' + String(group.month))}
                </span>
                <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-500">
                  {t('count', { count: group.items.length })}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                {group.items.map((item) => {
                  const isVideo = item.type === 'video';
                  const isLive = item.liveType === 'embedded' || item.liveType === 'paired';
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(String(item.id))}
                      className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-zinc-200/70 bg-zinc-100 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-800/70 dark:bg-zinc-900"
                    >
                      <BlurImage
                        src={item.src}
                        alt={item.title}
                        blurHash={item.blurHash}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 20vw"
                        className="object-cover transition duration-500 group-hover:scale-[1.05]"
                      />
                      {isVideo ? (
                        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-zinc-950/75 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                          <Film className="h-3 w-3" />
                        </span>
                      ) : isLive ? (
                        <span className="absolute right-2 top-2 rounded-full bg-amber-500/85 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                          LIVE
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        )}

        <div className="flex flex-col items-center gap-3 py-6 text-sm text-muted-foreground">
          {loadError ? (
            <>
              <p className="text-rose-600 dark:text-rose-400">{t('loadError')}</p>
              <Button type="button" variant="outline" size="sm" onClick={loadMore}>
                {t('retry')}
              </Button>
            </>
          ) : hasNext ? (
            <div className="inline-flex items-center gap-2">
              {loading ? <Spinner size="sm" /> : null}
              <span>{t('loading')}</span>
            </div>
          ) : items.length > 0 ? (
            <span>{t('allLoaded')}</span>
          ) : null}
        </div>
        <div ref={sentinelRef} className="h-4" />
      </div>

      <Gallery25
        items={items}
        showGrid={false}
        showChrome={false}
        selectedId={selectedId}
        onSelectedIdChange={setSelectedId}
      />
    </div>
  );
}
