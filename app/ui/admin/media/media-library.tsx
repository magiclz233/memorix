'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useMessages, useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import {
  Eye,
  EyeOff,
  Film,
  Image as ImageIcon,
  Sparkles,
  Star,
  StarOff,
} from 'lucide-react';

import { setFilesPublished, setHeroPhotos } from '@/app/lib/actions';
import type { MediaLibraryItem } from '@/app/lib/data';
import { resolveMessage } from '@/app/lib/i18n';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const formatSize = (size: number | null, unknownLabel: string) => {
  if (!size && size !== 0) return unknownLabel;
  if (size < 1024) return `${size} B`;
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
};

const formatDate = (value: Date | null | undefined, unknownLabel: string, locale: string) => {
  if (!value) return unknownLabel;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return unknownLabel;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

const formatResolution = (
  width: number | null,
  height: number | null,
  unknownLabel: string,
) => {
  if (!width || !height) return unknownLabel;
  return `${width}×${height}`;
};

const resolveMediaSrc = (item: MediaLibraryItem) => {
  if (item.mediaType === 'video') {
    return item.thumbUrl || null;
  }
  return item.thumbUrl || item.url || `/api/local-files/${item.id}`;
};

type MediaLibraryManagerProps = {
  items: MediaLibraryItem[];
  heroIds: number[];
  totalCount: number;
};

export function MediaLibraryManager({
  items,
  heroIds,
  totalCount,
}: MediaLibraryManagerProps) {
  const t = useTranslations('dashboard.media');
  const messages = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const heroIdSet = useMemo(() => new Set(heroIds), [heroIds]);

  const selectableIds = useMemo(
    () => items.filter((item) => !item.storage.isDisabled).map((item) => item.id),
    [items],
  );

  useEffect(() => {
    // 使用 flushSync 避免同步 setState 导致的级联渲染问题
    queueMicrotask(() => {
      setSelectedIds((prev) => prev.filter((id) => selectableIds.includes(id)));
    });
  }, [selectableIds]);

  const toggleSelect = (id: number) => {
    if (!selectableIds.includes(id)) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handlePublish = (publish: boolean) => {
    if (!selectedIds.length) {
      setMessage(t('library.selectFirst'));
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await setFilesPublished(selectedIds, publish);
      setMessage(result.message ?? null);
      setSelectedIds([]);
      router.refresh();
    });
  };

  const handleHero = (isHero: boolean) => {
    if (!selectedIds.length) {
      setMessage(t('library.selectFirst'));
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await setHeroPhotos(selectedIds, isHero);
      setMessage(result.message ?? null);
      setSelectedIds([]);
      router.refresh();
    });
  };

  const selectedCount = selectedIds.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white/80 px-4 py-3 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelectedIds(selectableIds)}
            disabled={isPending || selectableIds.length === 0}
          >
            {t('library.selectAllPage')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelectedIds([])}
            disabled={isPending || selectedCount === 0}
          >
            {t('library.clearSelection')}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => handlePublish(true)}
            disabled={isPending || selectedCount === 0}
          >
            <Eye className="mr-1.5 h-4 w-4" />
            {t('library.publishSelected')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePublish(false)}
            disabled={isPending || selectedCount === 0}
          >
            <EyeOff className="mr-1.5 h-4 w-4" />
            {t('library.unpublishSelected')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => handleHero(true)}
            disabled={isPending || selectedCount === 0}
          >
            <Star className="mr-1.5 h-4 w-4" />
            {t('library.setHero')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleHero(false)}
            disabled={isPending || selectedCount === 0}
          >
            <StarOff className="mr-1.5 h-4 w-4" />
            {t('library.unsetHero')}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <span>{t('library.selectedCount', { count: selectedCount })}</span>
          <span>{t('library.selectableCount', { count: selectableIds.length })}</span>
          <span>{t('library.totalCount', { count: totalCount })}</span>
        </div>
      </div>

      {message ? (
        <div className="rounded-xl border border-zinc-200 bg-white/80 px-4 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
          {message}
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const src = resolveMediaSrc(item);
          const isVideo = item.mediaType === 'video';
          const isSelected = selectedIds.includes(item.id);
          const rawTitle = item.title ?? item.path ?? null;
          const titleText = rawTitle
            ? resolveMessage(messages, rawTitle)
            : t('library.unnamed');
          const sourceLabel =
            item.storage.alias ||
            t(`storageLabels.${item.storage.type}`) ||
            item.storage.type.toUpperCase();
          const statusLabel = item.isPublished
            ? t('library.published')
            : t('library.unpublished');
          const shotAt = item.dateShot ?? item.mtime ?? item.createdAt;
          const meta = [
            formatDate(shotAt, t('library.unknownTime'), locale),
            formatSize(item.size ?? null, t('library.unknownSize')),
            formatResolution(
              item.resolutionWidth,
              item.resolutionHeight,
              t('library.unknownResolution'),
            ),
          ].join(' · ');

          return (
            <div
              key={item.id}
              className={cn(
                'group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white/80 shadow-sm transition-all hover:shadow-md dark:border-white/10 dark:bg-zinc-900/60',
                isSelected && 'ring-2 ring-indigo-500',
                item.storage.isDisabled && 'opacity-60',
              )}
            >
              <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(item.id)}
                  disabled={item.storage.isDisabled}
                  className="h-4 w-4 accent-indigo-600"
                />
                {heroIdSet.has(item.id) ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/90 px-2 py-0.5 text-xs text-white">
                    <Sparkles className="h-3 w-3" />
                    {t('library.hero')}
                  </span>
                ) : null}
              </div>

              <div className="relative h-48 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                {src ? (
                  <img
                    src={src}
                    alt={titleText}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-400">
                    {isVideo ? (
                      <Film className="h-8 w-8" />
                    ) : (
                      <ImageIcon className="h-8 w-8" />
                    )}
                  </div>
                )}
                {isVideo ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                    <Film className="h-8 w-8" />
                  </div>
                ) : null}
              </div>

              <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {titleText}
                    </h3>
                    <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                      {isVideo ? t('library.video') : t('library.image')}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{meta}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t('library.source', { label: sourceLabel })}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5',
                      item.isPublished
                        ? 'border-emerald-200 text-emerald-600 dark:border-emerald-500/40 dark:text-emerald-300'
                        : 'border-zinc-200 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400',
                    )}
                  >
                    {statusLabel}
                  </span>
                  {item.storage.isDisabled ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                      {t('library.sourceDisabled')}
                    </span>
                  ) : null}
                </div>

                {item.storage.isDisabled ? (
                  <Link
                    href="/dashboard/storage"
                    className="text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    {t('library.configureStorage')}
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
