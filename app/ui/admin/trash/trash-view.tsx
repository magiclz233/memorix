'use client';

import { useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  RotateCcw,
  Trash2,
  Film,
  Image as ImageIcon,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/app/lib/toast-utils';
import {
  purgeTrashedMedia,
  restoreTrashedMedia,
} from '@/app/lib/actions';

export type TrashItem = {
  id: number;
  title: string | null;
  mediaType: string | null;
  mimeType: string | null;
  size: number | null;
  isPublished: boolean | null;
  deletedAt: string | null;
  storageId: number;
  storageType: string;
};

type Props = {
  items: TrashItem[];
  total: number;
  page: number;
  pageSize: number;
  locale: string;
};

const formatBytes = (bytes: number | null) => {
  if (!bytes || bytes <= 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

export function TrashView({ items, total, page, pageSize, locale }: Props) {
  const t = useTranslations('dashboard.trash');
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [purgeConfirmIds, setPurgeConfirmIds] = useState<number[] | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const allSelected = items.length > 0 && items.every((item) => selectedIds.has(item.id));
  const selectedCount = selectedIds.size;

  const groupedByDay = useMemo(() => items, [items]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (allSelected) return new Set();
      return new Set(items.map((item) => item.id));
    });
  };

  const handleRestore = (ids: number[]) => {
    if (ids.length === 0) return;
    startTransition(async () => {
      const result = await restoreTrashedMedia(ids);
      if (result.success) {
        showSuccess(result.message);
        setSelectedIds(new Set());
        router.refresh();
      } else {
        showError(result.message);
      }
    });
  };

  const confirmPurge = () => {
    if (!purgeConfirmIds || purgeConfirmIds.length === 0) return;
    const ids = purgeConfirmIds;
    setPurgeConfirmIds(null);
    startTransition(async () => {
      const result = await purgeTrashedMedia(ids);
      if (result.success) {
        showSuccess(result.message);
        setSelectedIds(new Set());
        router.refresh();
      } else {
        showError(result.message);
      }
    });
  };

  if (items.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 py-24 text-center dark:border-zinc-700'>
        <Trash2 className='mb-4 h-10 w-10 text-zinc-400' />
        <p className='text-sm font-medium text-zinc-500'>{t('empty')}</p>
        <p className='mt-1 text-xs text-zinc-400'>{t('emptyHint')}</p>
      </div>
    );
  }

  return (
    <div className='space-y-5'>
      {/* 批量操作栏 */}
      <div className='flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950'>
        <div className='flex items-center gap-3'>
          <input
            type='checkbox'
            checked={allSelected}
            onChange={toggleSelectAll}
            className='h-4 w-4 cursor-pointer rounded border-zinc-300 accent-indigo-600 focus:ring-indigo-500'
            title={t('selectAll')}
          />
          <span className='text-sm text-muted-foreground'>
            {t('selectedCount', { count: selectedCount })}
          </span>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='rounded-full'
            disabled={selectedCount === 0 || isPending}
            onClick={() => handleRestore(Array.from(selectedIds))}
          >
            <RotateCcw className='mr-2 h-4 w-4' />
            {t('restoreSelected')}
          </Button>
          <Button
            variant='destructive'
            size='sm'
            className='rounded-full'
            disabled={selectedCount === 0 || isPending}
            onClick={() => setPurgeConfirmIds(Array.from(selectedIds))}
          >
            <Trash2 className='mr-2 h-4 w-4' />
            {t('purgeSelected')}
          </Button>
        </div>
      </div>

      {/* 列表 */}
      <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'>
        {groupedByDay.map((item) => (
          <div
            key={item.id}
            className={cn(
              'group relative overflow-hidden rounded-2xl border bg-white transition dark:bg-zinc-950',
              selectedIds.has(item.id)
                ? 'border-indigo-500 ring-2 ring-indigo-500/50'
                : 'border-zinc-200 dark:border-zinc-800',
            )}
          >
            <div className='relative aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900'>
              <Image
                src={`/api/media/thumb/${item.id}`}
                alt={item.title ?? 'deleted media'}
                fill
                unoptimized
                sizes='(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 16vw'
                className='object-cover opacity-90 transition group-hover:opacity-100'
              />
              <div className='absolute left-2 top-2'>
                <input
                  type='checkbox'
                  checked={selectedIds.has(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  aria-label={item.title ?? undefined}
                  className='h-4 w-4 cursor-pointer rounded border-zinc-300 accent-indigo-600 focus:ring-indigo-500'
                />
              </div>
              <div className='absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white'>
                {item.mediaType === 'video' ? (
                  <Film className='h-3.5 w-3.5' />
                ) : (
                  <ImageIcon className='h-3.5 w-3.5' />
                )}
              </div>
            </div>
            <div className='space-y-1 p-3'>
              <p className='truncate text-xs font-medium' title={item.title ?? undefined}>
                {item.title ?? `#${item.id}`}
              </p>
              <p className='text-[10px] text-zinc-400'>
                {item.deletedAt
                  ? new Date(item.deletedAt).toLocaleString(locale === 'en' ? 'en-US' : 'zh-CN')
                  : ''}
              </p>
              <p className='text-[10px] text-zinc-400'>{formatBytes(item.size)}</p>
              <div className='flex items-center justify-between pt-1'>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-7 rounded-full px-2 text-xs'
                  disabled={isPending}
                  onClick={() => handleRestore([item.id])}
                >
                  <RotateCcw className='mr-1 h-3 w-3' />
                  {t('restore')}
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-7 rounded-full px-2 text-xs text-rose-600 hover:text-rose-700'
                  disabled={isPending}
                  onClick={() => setPurgeConfirmIds([item.id])}
                >
                  <Trash2 className='mr-1 h-3 w-3' />
                  {t('purge')}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className='flex items-center justify-center gap-2 pt-2'>
          {page > 1 && (
            <Button
              variant='outline'
              size='sm'
              className='rounded-full'
              onClick={() => router.push(`/dashboard/trash?page=${page - 1}`)}
            >
              {t('prevPage')}
            </Button>
          )}
          <span className='text-xs text-zinc-400'>
            {t('pageIndicator', { page, total: totalPages })}
          </span>
          {page < totalPages && (
            <Button
              variant='outline'
              size='sm'
              className='rounded-full'
              onClick={() => router.push(`/dashboard/trash?page=${page + 1}`)}
            >
              {t('nextPage')}
            </Button>
          )}
        </div>
      )}

      {/* 彻底删除确认弹窗 */}
      {purgeConfirmIds && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
          <div className='w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-950'>
            <div className='mb-3 flex items-center gap-2 text-rose-600'>
              <AlertTriangle className='h-5 w-5' />
              <h3 className='text-base font-bold'>{t('purgeConfirmTitle')}</h3>
            </div>
            <p className='text-sm text-muted-foreground'>{t('purgeConfirmBody')}</p>
            <p className='mt-1 text-xs font-medium text-rose-500'>
              {t('purgeConfirmCount', { count: purgeConfirmIds.length })}
            </p>
            <div className='mt-5 flex justify-end gap-2'>
              <Button
                variant='ghost'
                className='rounded-full'
                onClick={() => setPurgeConfirmIds(null)}
              >
                {t('cancel')}
              </Button>
              <Button
                variant='destructive'
                className='rounded-full'
                onClick={confirmPurge}
              >
                {t('purgeConfirmAction')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
