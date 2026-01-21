'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STORAGE_LABELS: Record<string, string> = {
  local: '本地存储',
  nas: 'NAS 存储',
  s3: 'S3 兼容',
  qiniu: '七牛云',
};

const formatSize = (size: number | null) => {
  if (!size && size !== 0) return '未知大小';
  if (size < 1024) return `${size} B`;
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
};

const formatDate = (value?: Date | null) => {
  if (!value) return '未知时间';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '未知时间';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

const formatResolution = (width: number | null, height: number | null) => {
  if (!width || !height) return '未知分辨率';
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
    setSelectedIds((prev) => prev.filter((id) => selectableIds.includes(id)));
  }, [selectableIds]);

  const toggleSelect = (id: number) => {
    if (!selectableIds.includes(id)) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handlePublish = (publish: boolean) => {
    if (!selectedIds.length) {
      setMessage('请先选择要操作的资源。');
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
      setMessage('请先选择要操作的资源。');
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
            全选当前页
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelectedIds([])}
            disabled={isPending || selectedCount === 0}
          >
            清空选择
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => handlePublish(true)}
            disabled={isPending || selectedCount === 0}
          >
            <Eye className="mr-1.5 h-4 w-4" />
            发布选中
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePublish(false)}
            disabled={isPending || selectedCount === 0}
          >
            <EyeOff className="mr-1.5 h-4 w-4" />
            取消发布
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => handleHero(true)}
            disabled={isPending || selectedCount === 0}
          >
            <Star className="mr-1.5 h-4 w-4" />
            设为首页
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleHero(false)}
            disabled={isPending || selectedCount === 0}
          >
            <StarOff className="mr-1.5 h-4 w-4" />
            取消首页
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <span>已选 {selectedCount} 项</span>
          <span>当前页可选 {selectableIds.length} 项</span>
          <span>资源总数 {totalCount} 项</span>
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
          const sourceLabel =
            item.storage.alias ||
            STORAGE_LABELS[item.storage.type] ||
            item.storage.type.toUpperCase();
          const statusLabel = item.isPublished ? '已发布' : '未发布';
          const shotAt = item.dateShot ?? item.mtime ?? item.createdAt;
          const meta = [
            formatDate(shotAt),
            formatSize(item.size ?? null),
            formatResolution(item.resolutionWidth, item.resolutionHeight),
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
                    首页
                  </span>
                ) : null}
              </div>

              <div className="relative h-48 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                {src ? (
                  <img
                    src={src}
                    alt={item.title ?? item.path}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-400">
                    {isVideo ? <Film className="h-8 w-8" /> : <ImageIcon className="h-8 w-8" />}
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
                      {item.title ?? item.path ?? '未命名'}
                    </h3>
                    <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                      {isVideo ? '视频' : '图片'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{meta}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    来源：{sourceLabel}
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
                      来源已禁用
                    </span>
                  ) : null}
                </div>

                {item.storage.isDisabled ? (
                  <Link
                    href="/dashboard/storage"
                    className="text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    去存储配置启用
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
