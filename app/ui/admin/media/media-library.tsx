'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useMessages, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter, usePathname } from '@/i18n/navigation';
import {
  Eye,
  EyeOff,
  Film,
  Image as ImageIcon,
  Sparkles,
  Star,
  HardDrive,
  Cloud,
  Server,
  Database,
  AlertCircle,
} from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { setFilesPublished, setHeroPhotos } from '@/app/lib/actions';
import type { MediaLibraryItem } from '@/app/lib/data';
import { resolveMessage } from '@/app/lib/i18n';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Gallery25 } from '@/components/gallery25';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

const clampColumnCount = (value: number) => Math.min(10, Math.max(3, value));

const readStoredNumber = (key: string, fallback: number) => {
  if (typeof window === 'undefined') return fallback;
  const stored = window.localStorage.getItem(key);
  if (!stored) return fallback;
  const parsed = Number(stored);
  if (Number.isNaN(parsed)) return fallback;
  return clampColumnCount(parsed);
};

type StorageItem = {
  id: number;
  type: string;
  config: unknown;
  createdAt: Date;
  updatedAt: Date;
  alias?: string | null; // Helper for display
};

type MediaLibraryManagerProps = {
  items: MediaLibraryItem[];
  heroIds: number[];
  totalCount: number;
  storages?: StorageItem[];
};

export function MediaLibraryManager({
  items,
  heroIds,
  totalCount,
  storages = [],
}: MediaLibraryManagerProps) {
  const t = useTranslations('dashboard.media');
  const messages = useMessages();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [viewingItemId, setViewingItemId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const heroIdSet = useMemo(() => new Set(heroIds), [heroIds]);
  const [columnCount, setColumnCount] = useState(() =>
    readStoredNumber('media-library-columns', 6),
  );

  // Filter States
  const currentCategory = searchParams.get('category') || 'all';
  const currentStorageId = searchParams.get('storageId') 
    ? Number(searchParams.get('storageId')) 
    : null;
  const currentLimit = searchParams.get('limit') || '24';

  // Group storages by type
  const storageGroups = useMemo(() => {
    const groups: Record<string, StorageItem[]> = {
      local: [],
      nas: [],
      s3: [],
      qiniu: [],
    };
    
    storages.forEach(s => {
      // Parse config to get alias if needed, though we might need to cast type
      const config = s.config as { alias?: string };
      const itemWithAlias = { ...s, alias: config.alias };
      if (groups[s.type]) {
        groups[s.type].push(itemWithAlias);
      }
    });
    return groups;
  }, [storages]);

  const categories = [
    { id: 'all', label: t('filters.type.all'), icon: Database },
    { id: 'local', label: t('storageLabels.local'), icon: HardDrive },
    { id: 'nas', label: t('storageLabels.nas'), icon: Server },
    { id: 's3', label: t('storageLabels.s3'), icon: Cloud },
    { id: 'qiniu', label: t('storageLabels.qiniu'), icon: Cloud },
  ];

  const handleCategoryChange = (category: string) => {
    const params = new URLSearchParams(searchParams);
    if (category === 'all') {
      params.delete('category');
      params.delete('storageId');
    } else {
      params.set('category', category);
      params.delete('storageId'); // Reset specific storage when changing category
    }
    params.delete('page'); // Reset page
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleStorageChange = (storageId: number | null) => {
    const params = new URLSearchParams(searchParams);
    if (storageId === null) {
      params.delete('storageId');
    } else {
      params.set('storageId', String(storageId));
    }
    params.delete('page');
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleLimitChange = (limit: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('limit', limit);
    params.delete('page');
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

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

  useEffect(() => {
    window.localStorage.setItem('media-library-columns', String(columnCount));
  }, [columnCount]);

  const galleryItems = useMemo(() => {
    return items.map((item) => {
      const titleText = item.title
        ? resolveMessage(messages, item.title)
        : item.path?.split('/').pop() || t('library.unnamed');
      const resolution = formatResolution(
        item.resolutionWidth,
        item.resolutionHeight,
        '',
      );
      return {
        id: item.id,
        type: item.mediaType === 'video' ? 'video' : 'photo',
        src:
          resolveMediaSrc(item) ||
          item.url ||
          `/api/local-files/${item.id}`,
        title: titleText,
        description: item.description ?? null,
        camera: item.camera,
        maker: item.maker,
        lens: item.lens,
        exposure: item.exposure ?? undefined,
        aperture: item.aperture ?? undefined,
        iso: item.iso ?? undefined,
        focalLength: item.focalLength ?? undefined,
        whiteBalance: item.whiteBalance ?? undefined,
        size: item.size ?? undefined,
        width: item.resolutionWidth ?? undefined,
        height: item.resolutionHeight ?? undefined,
        gpsLatitude: item.gpsLatitude ?? undefined,
        gpsLongitude: item.gpsLongitude ?? undefined,
        dateShot: item.dateShot ? item.dateShot.toISOString() : null,
        createdAt: item.createdAt ? item.createdAt.toISOString() : null,
        blurHash: item.blurHash ?? null,
        resolution: resolution || null,
        isPublished: item.isPublished,
      };
    });
  }, [items, messages, t]);

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

  const hasDisabledStorages = useMemo(() => {
    return storages?.some((s) => (s.config as any)?.isDisabled);
  }, [storages]);

  const selectedCount = selectedIds.length;

  return (
    <div className="space-y-6">
      {/* Top Filter Area */}
      <div className="flex flex-col gap-4">
        {/* Level 1: Categories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = currentCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={cn(
                  'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-zinc-900 text-white shadow-md dark:bg-zinc-100 dark:text-zinc-900'
                    : 'bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700',
                )}
              >
                <Icon className="h-4 w-4" />
                {cat.label}
              </button>
            );
          })}
          
          {hasDisabledStorages && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="ml-auto flex cursor-help items-center justify-center rounded-full bg-amber-50 p-1.5 text-amber-600 transition-colors hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p className="max-w-xs text-xs">{t('disabledWarning')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Level 2: Storage Instances */}
        {currentCategory !== 'all' && storageGroups[currentCategory]?.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide pl-1">
            <button
              onClick={() => handleStorageChange(null)}
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                currentStorageId === null
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-300'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400',
              )}
            >
              {t('filters.allInstances') || 'All'}
            </button>
            {storageGroups[currentCategory].map((storage) => {
              const isActive = currentStorageId === storage.id;
              return (
                <button
                  key={storage.id}
                  onClick={() => handleStorageChange(storage.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    isActive
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-300'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400',
                  )}
                >
                  {storage.alias || `${storage.type.toUpperCase()} #${storage.id}`}
                </button>
              );
            })}
          
            {hasDisabledStorages && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="ml-auto flex cursor-help items-center justify-center rounded-full bg-amber-50 p-1.5 text-amber-600 transition-colors hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p className="max-w-xs text-xs">{t('disabledWarning')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}

        {/* Level 3: Action Bar */}
        <div className="flex min-h-[40px] items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            {/* Select All Checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectableIds.length > 0 && selectedIds.length === selectableIds.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedIds(selectableIds);
                  } else {
                    setSelectedIds([]);
                  }
                }}
                disabled={selectableIds.length === 0}
                className="h-4 w-4 cursor-pointer rounded border-zinc-300 accent-indigo-600 focus:ring-indigo-500"
                title={t('library.selectAllPage')}
              />
            </div>
            
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />

            {selectedCount > 0 ? (
              <span className="font-medium text-indigo-600 dark:text-indigo-400">
                {t('library.selectedCount', { count: selectedCount })}
              </span>
            ) : (
              <span>{t('library.totalCount', { count: totalCount })}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="hidden items-center gap-2 text-xs text-zinc-500 sm:flex">
              <span>{t('library.columns.label')}</span>
              <input
                type="range"
                min={3}
                max={10}
                step={1}
                value={columnCount}
                onChange={(event) =>
                  setColumnCount(clampColumnCount(Number(event.target.value)))
                }
                className="h-1 w-28 cursor-pointer accent-indigo-500"
                aria-label={t('library.columns.aria')}
              />
              <span>{t('library.columns.count', { count: columnCount })}</span>
            </label>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-2 text-zinc-500">
                  <span className="text-xs">
                    {t('library.perPage', { count: currentLimit })}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup
                  value={currentLimit}
                  onValueChange={(value) => handleLimitChange(value)}
                >
                  <DropdownMenuRadioItem value="24">
                    {t('library.perPageOption', { count: 24 })}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="48">
                    {t('library.perPageOption', { count: 48 })}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="96">
                    {t('library.perPageOption', { count: 96 })}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="mx-1 hidden h-4 w-px bg-zinc-200 dark:bg-zinc-700 sm:block" />

            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              onClick={() => handlePublish(true)}
              disabled={!selectedCount}
              title={t('library.publishSelected')}
            >
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">{t('filters.status.published')}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              onClick={() => handlePublish(false)}
              disabled={!selectedCount}
              title={t('library.unpublishSelected')}
            >
              <EyeOff className="h-4 w-4" />
              <span className="hidden sm:inline">{t('filters.status.unpublished')}</span>
            </Button>

            <div className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />

            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              onClick={() => handleHero(true)}
              disabled={!selectedCount}
              title={t('library.setHero')}
            >
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">{t('library.hero')}</span>
            </Button>

            {selectedCount > 0 && (
              <>
                <div className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => setSelectedIds([])}
                  title={t('library.clearSelection')}
                >
                  <span className="text-xs">✕</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {message ? (
        <div className="rounded-xl border border-zinc-200 bg-white/80 px-4 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
          {message}
        </div>
      ) : null}

      {/* Grid Content */}
      <div
        className={cn(
          'grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4',
          {
            'lg:grid-cols-3 xl:grid-cols-3': columnCount === 3,
            'lg:grid-cols-4 xl:grid-cols-4': columnCount === 4,
            'lg:grid-cols-5 xl:grid-cols-5': columnCount === 5,
            'lg:grid-cols-6 xl:grid-cols-6': columnCount === 6,
            'lg:grid-cols-7 xl:grid-cols-7': columnCount === 7,
            'lg:grid-cols-8 xl:grid-cols-8': columnCount === 8,
            'lg:grid-cols-9 xl:grid-cols-9': columnCount === 9,
            'lg:grid-cols-10 xl:grid-cols-10': columnCount === 10,
          },
        )}
      >
        {items.map((item) => {
          const src = resolveMediaSrc(item);
          const isVideo = item.mediaType === 'video';
          const isSelected = selectedIds.includes(item.id);
          const rawTitle = item.title ?? item.path ?? null;
          const titleText = rawTitle
            ? resolveMessage(messages, rawTitle)
            : t('library.unnamed');
          const shotAt = item.dateShot ?? item.mtime ?? item.createdAt;
          const resolutionText = formatResolution(
            item.resolutionWidth,
            item.resolutionHeight,
            '',
          );
          const sizeText = formatSize(item.size ?? null, '');

          return (
            <div
              key={item.id}
              className={cn(
                'group relative aspect-square overflow-hidden rounded-xl bg-zinc-100 transition-all dark:bg-zinc-800',
                isSelected && 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-zinc-950',
                item.storage.isDisabled && 'opacity-60',
              )}
            >
              {/* Image Layer */}
              {src ? (
                <img
                  src={src}
                  alt={titleText}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-110 cursor-zoom-in"
                  onClick={() => setViewingItemId(item.id)}
                />
              ) : (
                <div 
                  className="flex h-full w-full items-center justify-center text-zinc-400 cursor-zoom-in"
                  onClick={() => setViewingItemId(item.id)}
                >
                  {isVideo ? (
                    <Film className="h-8 w-8" />
                  ) : (
                    <ImageIcon className="h-8 w-8" />
                  )}
                </div>
              )}

              {/* Hover Overlay */}
              <div 
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" 
              />

              {/* Top Left: Status Indicators */}
              <div className="absolute left-2 top-2 z-10 flex flex-wrap gap-1 max-w-[calc(100%-2rem)]">
                 <TooltipProvider>
                   <Tooltip>
                     <TooltipTrigger asChild>
                       <span
                         className={cn(
                           'inline-flex h-2.5 w-2.5 items-center justify-center rounded-full shadow-sm',
                           item.isPublished ? 'bg-emerald-500/90' : 'bg-zinc-500/90',
                         )}
                         aria-label={
                           item.isPublished
                             ? t('library.published')
                             : t('library.unpublished')
                         }
                       />
                     </TooltipTrigger>
                     <TooltipContent side="top">
                       {item.isPublished ? t('library.published') : t('library.unpublished')}
                     </TooltipContent>
                   </Tooltip>
                 </TooltipProvider>
                 
                 {isVideo && (
                    <span className="flex items-center rounded bg-black/50 px-1 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                      VIDEO
                    </span>
                 )}
                 {heroIdSet.has(item.id) && (
                    <span className="flex items-center rounded-full bg-indigo-500/90 p-1 text-white backdrop-blur-sm">
                      <Sparkles className="h-2 w-2" />
                    </span>
                 )}
              </div>

              {/* Top Right: Selection Checkbox (Visible on hover or selected) */}
              <div
                className={cn(
                  'absolute right-2 top-2 z-10 transition-opacity duration-200',
                  isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                )}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(item.id)}
                  disabled={item.storage.isDisabled}
                  className="h-5 w-5 cursor-pointer accent-indigo-600"
                />
              </div>

              {/* Bottom Info (Visible on hover) */}
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <p className="truncate text-xs font-medium leading-tight">{titleText}</p>
                <div className="mt-1 flex items-center justify-between text-[10px] text-white/70">
                   <span>{resolutionText}</span>
                   <span>{sizeText}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Gallery25
        items={galleryItems}
        showGrid={false}
        selectedId={viewingItemId}
        onSelectedIdChange={(id) => {
          if (id === null) {
            setViewingItemId(null);
            return;
          }
          const nextId = typeof id === 'number' ? id : Number(id);
          setViewingItemId(Number.isNaN(nextId) ? null : nextId);
        }}
        statusLabels={{
          published: t('library.published'),
          unpublished: t('library.unpublished'),
        }}
      />
    </div>
  );
}
