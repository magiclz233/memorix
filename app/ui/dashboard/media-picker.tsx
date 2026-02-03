'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { fetchMediaForPicker } from '@/app/lib/actions/unified-collections';
import { Loader2, Check, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type MediaItem = {
  id: number;
  thumbUrl: string | null;
  url: string | null;
  title: string | null;
  mediaType: 'image' | 'video' | 'animated';
};

type MediaPickerProps = {
  onConfirm: (selectedIds: number[]) => void;
  onConfirmItems?: (selectedItems: MediaItem[]) => void;
  onCancel: () => void;
  selectionMode?: 'multiple' | 'single';
  initialSelectedIds?: number[];
  disabledIds?: number[];
  allowedMediaTypes?: Array<'image' | 'video' | 'animated'>;
  maxSelect?: number;
};

export function MediaPicker({
  onConfirm,
  onConfirmItems,
  onCancel,
  selectionMode = 'multiple',
  initialSelectedIds = [],
  disabledIds = [],
  allowedMediaTypes,
  maxSelect,
}: MediaPickerProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>(initialSelectedIds);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const disabledSet = new Set(disabledIds);
  const hasLoadedRef = useRef(false);
  const t = useTranslations('dashboard.collections.picker');

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const newItems = (await fetchMediaForPicker(
        page,
        24,
        allowedMediaTypes,
      )) as unknown as MediaItem[];
      if (newItems.length < 24) {
        setHasMore(false);
      }
      setItems((prev) => {
        const existing = new Set(prev.map((item) => item.id));
        const filtered = newItems.filter((item) => !existing.has(item.id));
        return [...prev, ...filtered];
      });
      setPage((p) => p + 1);
    } catch (error) {
      console.error('Failed to load media:', error);
    } finally {
      setIsLoading(false);
    }
  }, [allowedMediaTypes, hasMore, isLoading, page]);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadMore();
  }, [loadMore]);

  const toggleSelection = (id: number) => {
    if (selectionMode === 'single') {
      setSelectedIds((prev) => (prev[0] === id ? [] : [id]));
      return;
    }
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      if (maxSelect && prev.length >= maxSelect) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleConfirm = () => {
    startTransition(() => {
      onConfirm(selectedIds);
      if (onConfirmItems) {
        const selectedItems = items.filter((item) =>
          selectedIds.includes(item.id),
        );
        onConfirmItems(selectedItems);
      }
    });
  };

  return (
    <div className="flex h-[60vh] flex-col gap-4">
      <div className="flex-1 overflow-y-auto p-1">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {items.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            const isDisabled = disabledSet.has(item.id);
            const mediaSrc = item.thumbUrl || item.url;
            return (
              <div
                key={item.id}
                className={cn(
                  'group relative aspect-square overflow-hidden rounded-md border bg-zinc-100 dark:bg-zinc-800',
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-500'
                    : 'border-zinc-200 dark:border-zinc-800',
                  isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                )}
                onClick={() => {
                  if (isDisabled) return;
                  toggleSelection(item.id);
                }}
              >
                {mediaSrc ? (
                  <Image
                    src={mediaSrc}
                    alt={item.title || ''}
                    fill
                    sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 12vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-400">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                )}
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-indigo-500/40 backdrop-blur-[1px]">
                    <Check className="h-8 w-8 text-white drop-shadow-md" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {isLoading && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        )}
        {!isLoading && hasMore && (
          <div className="flex justify-center py-4">
            <Button variant="ghost" onClick={loadMore}>
              {t('loadMore')}
            </Button>
          </div>
        )}
      </div>
      <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            {t('selected', { count: selectedIds.length })}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} disabled={isPending}>
              {t('cancel')}
            </Button>
            <Button onClick={handleConfirm} disabled={selectedIds.length === 0 || isPending}>
              {isPending ? t('confirming') : t('confirm')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
