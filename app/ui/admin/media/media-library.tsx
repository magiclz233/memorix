'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useMessages, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useVirtualizer } from '@tanstack/react-virtual';
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
  Download,
  Trash2,
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
import { BlurImage } from '@/app/ui/gallery/blur-image';
import { MediaLibrarySkeleton } from '@/app/ui/components/skeletons';
import { useDebounce } from '@/app/ui/hooks/use-debounce';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MediaSearchBar } from './media-search-bar';
import { StorageTypeFilter } from './storage-type-filter';
import { AdvancedFilterPanel } from './advanced-filter-panel';
import { FilterChips } from './filter-chips';
import { useMediaFilters, type FilterKey } from './use-media-filters';
import { showErrorToast, showLoadingToast, showSuccessToast, updateToast } from '@/app/lib/batch-operations';

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
  return `${width} 脳 ${height}`;
};

const resolveMediaSrc = (item: MediaLibraryItem) =>
  item.thumbUrl || `/api/media/thumb/${item.id}` || item.url || `/api/local-files/${item.id}`;

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
  const [, startTransition] = useTransition();

  // 处理选中状态
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [viewingItemId, setViewingItemId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const heroIdSet = useMemo(() => new Set(heroIds), [heroIds]);
  const [columnCount, setColumnCount] = useState(() =>
    readStoredNumber('media-library-columns', 6),
  );

  // Filter States
  const { filters, isPending: isFilterPending, patchFilters, clearAll, removeFilter } =
    useMediaFilters();
  const [searchInput, setSearchInput] = useState(filters.q);
  const debouncedSearch = useDebounce(searchInput, 300);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const gridParentRef = useRef<HTMLDivElement | null>(null);
  const [gridWidth, setGridWidth] = useState(0);

  const currentCategory = filters.category;
  const currentStorageId = filters.storageId;
  const currentLimit = searchParams.get('limit') || '24';

  useEffect(() => {
    setSearchInput(filters.q);
  }, [filters.q]);

  useEffect(() => {
    if (debouncedSearch !== filters.q) {
      patchFilters({ q: debouncedSearch });
    }
  }, [debouncedSearch, filters.q, patchFilters]);

  // Group storages by type
  const storageGroups = useMemo(() => {
    const groups: Record<string, StorageItem[]> = {
      local: [],
      nas: [],
      s3: [],
      qiniu: [],
    };

    storages.forEach((s) => {
      const config = s.config as { alias?: string };
      const itemWithAlias = { ...s, alias: config.alias };
      if (groups[s.type]) {
        groups[s.type].push(itemWithAlias);
      }
    });
    return groups;
  }, [storages]);

  const categories = useMemo(
    () => [
      { id: 'all', label: t('filters.type.all'), icon: Database },
      { id: 'local', label: t('storageLabels.local'), icon: HardDrive },
      { id: 'nas', label: t('storageLabels.nas'), icon: Server },
      { id: 's3', label: t('storageLabels.s3'), icon: Cloud },
    ],
    [t],
  );

  const handleCategoryChange = (category: string) => {
    patchFilters({ category });
  };

  const handleStorageChange = (storageId: number | null) => {
    patchFilters({ storageId });
  };

  const handleLimitChange = (limit: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('limit', limit);
    params.delete('page');
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: FilterKey; label: string }> = [];

    if (filters.q) chips.push({ key: 'q', label: t('filters.search') + ': ' + filters.q });
    if (filters.category !== 'all') {
      chips.push({
        key: 'category',
        label: categories.find((item) => item.id === filters.category)?.label || filters.category,
      });
    }
    if (filters.storageId) {
      const target = storages.find((item) => item.id === filters.storageId);
      chips.push({
        key: 'storageId',
        label: target ? target.type.toUpperCase() + ' #' + target.id : 'ID ' + filters.storageId,
      });
    }
    if (filters.status !== 'all') {
      chips.push({
        key: 'status',
        label:
          filters.status === 'published'
            ? t('filters.status.published')
            : t('filters.status.unpublished'),
      });
    }
    if (filters.type !== 'all') {
      chips.push({
        key: 'type',
        label:
          filters.type === 'image'
            ? t('filters.type.image')
            : filters.type === 'video'
              ? t('filters.type.video')
              : t('filters.type.animated'),
      });
    }
    if (filters.dateFrom) chips.push({ key: 'dateFrom', label: t('filters.from') + ': ' + filters.dateFrom });
    if (filters.dateTo) chips.push({ key: 'dateTo', label: t('filters.to') + ': ' + filters.dateTo });
    if (filters.hero !== 'all') {
      chips.push({
        key: 'hero',
        label: filters.hero === 'yes' ? t('library.setAsHero') : t('library.unsetHero'),
      });
    }

    return chips;
  }, [categories, filters, storages, t]);

  const advancedStorageOptions = useMemo(() => {
    const source = currentCategory === 'all' ? storages : storageGroups[currentCategory] || [];
    return source.map((item) => ({
      id: item.id,
      label: item.alias || `${item.type.toUpperCase()} #${item.id}`,
    }));
  }, [currentCategory, storageGroups, storages]);

  const activeFilterCount = activeFilterChips.length;

  const selectableIds = useMemo(
    () => items.filter((item) => !item.storage.isDisabled).map((item) => item.id),
    [items],
  );

  useEffect(() => {
    // 纭繚鍙繚鐣欏綋鍓嶅彲鍕鹃€夌殑ID
    queueMicrotask(() => {
      setSelectedIds((prev) => {
        const next = new Set<number>();
        prev.forEach((id) => {
          if (selectableIds.includes(id)) {
            next.add(id);
          }
        });
        return next;
      });
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
        item.resolutionWidth ?? item.videoWidth,
        item.resolutionHeight ?? item.videoHeight,
        '',
      );
      const isAnimated = item.mediaType === 'animated';
      return {
        id: item.id,
        type: (item.mediaType === 'video' ? 'video' : 'photo') as 'video' | 'photo',
        src:
          resolveMediaSrc(item) ||
          item.url ||
          `/api/local-files/${item.id}`,
        videoUrl:
          item.mediaType === 'video' ? `/api/media/stream/${item.id}` : null,
        animatedUrl: isAnimated ? (item.url || `/api/local-files/${item.id}`) : null,
        isAnimated,
        duration: item.videoDuration ?? null,
        liveType: (item.liveType as 'none' | 'embedded' | 'paired') ?? 'none',
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
        width: item.resolutionWidth ?? item.videoWidth ?? undefined,
        height: item.resolutionHeight ?? item.videoHeight ?? undefined,
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

  const galleryItemsForLightbox = useMemo(() => {
    return galleryItems.map((item) => ({
      ...item,
      id: String(item.id),
    }));
  }, [galleryItems]);

  const toggleSelect = (id: number) => {
    if (!selectableIds.includes(id)) return;
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

  const handlePublish = (publish: boolean) => {
    if (selectedIds.size === 0) {
      setMessage(t('library.selectFirst'));
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await setFilesPublished(Array.from(selectedIds), publish);
      setMessage(result.message ?? null);
      setSelectedIds(new Set());
      router.refresh();
    });
  };

  const handleHero = (isHero: boolean) => {
    if (selectedIds.size === 0) {
      setMessage(t('library.selectFirst'));
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await setHeroPhotos(Array.from(selectedIds), isHero);
      setMessage(result.message ?? null);
      setSelectedIds(new Set());
      router.refresh();
    });
  };

  const hasDisabledStorages = useMemo(() => {
    return storages?.some((s) => (s.config as any)?.isDisabled);
  }, [storages]);

  // 鎵归噺鍒犻櫎鎿嶄綔
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) {
      showErrorToast(t('library.selectFirst'));
      return;
    }

    const confirmed = confirm(t('library.deleteConfirm', { count: selectedIds.size }));
    if (!confirmed) return;

    const fileIds = Array.from(selectedIds);
    const toastId = showLoadingToast(t('library.deleting'));

    setIsDeleting(true);
    setMessage(null);

    try {
      const { deleteMediaFiles } = await import('@/app/lib/actions');
      const result = await deleteMediaFiles(fileIds);

      if (result.success) {
        setSelectedIds(new Set());
        router.refresh();
        updateToast(toastId, 'success', t('library.deleteSuccess'));
      } else {
        updateToast(toastId, 'error', result.message || t('library.deleteFailed'));
      }
    } catch (error) {
      console.error('Delete error:', error);
      updateToast(toastId, 'error', t('library.deleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBatchDownload = async () => {
    if (selectedIds.size === 0) {
      showErrorToast(t('library.selectFirst'));
      return;
    }

    setIsDownloading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileIds: Array.from(selectedIds),
        }),
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // 处理文件流对象
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // 尝试从响应头提取文件名，否则使用默认名称
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `media_${Date.now()}.zip`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSelectedIds(new Set());
      showSuccessToast(t('library.downloadSuccess'));
    } catch (error) {
      console.error('Download error:', error);
      showErrorToast(t('library.downloadFailed'));
    } finally {
      setIsDownloading(false);
    }
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.size === selectableIds.length && selectableIds.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableIds));
    }
  };

  const selectedCount = selectedIds.size;

  const [viewportWidth, setViewportWidth] = useState(1280);

  useEffect(() => {
    const updateWidth = () => {
      const width = gridParentRef.current?.clientWidth || window.innerWidth;
      setViewportWidth(width);
      setGridWidth(width);
    };

    updateWidth();

    const observer = new ResizeObserver(() => updateWidth());
    if (gridParentRef.current) {
      observer.observe(gridParentRef.current);
    }

    window.addEventListener('resize', updateWidth);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  const effectiveColumns = useMemo(() => {
    if (viewportWidth < 640) return 2;
    if (viewportWidth < 768) return 3;
    if (viewportWidth < 1024) return 4;
    return columnCount;
  }, [viewportWidth, columnCount]);

  const gap = 8;
  const itemSize = useMemo(() => {
    const width = gridWidth || viewportWidth;
    const usable = width - gap * (effectiveColumns - 1);
    return Math.max(120, Math.floor(usable / effectiveColumns));
  }, [effectiveColumns, gridWidth, viewportWidth]);

  const rowCount = Math.ceil(items.length / effectiveColumns);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => gridParentRef.current,
    estimateSize: () => itemSize + gap,
    overscan: 5,
  });

  return (
    <div className="space-y-6">
      {/* Top Filter Area */}
      <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-3">
          <MediaSearchBar
            value={searchInput}
            placeholder={t('filters.searchPlaceholder')}
            onChange={setSearchInput}
            onClear={() => setSearchInput('')}
            clearAriaLabel={t('filters.clear')}
          />

          <AdvancedFilterPanel
            open={advancedOpen}
            activeCount={activeFilterCount}
            storageOptions={advancedStorageOptions}
            storageId={filters.storageId}
            published={filters.status}
            mediaType={filters.type}
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            hero={filters.hero}
            onOpenChange={setAdvancedOpen}
            onStorageChange={handleStorageChange}
            onPublishedChange={(value) => patchFilters({ status: value })}
            onMediaTypeChange={(value) => patchFilters({ type: value })}
            onDateFromChange={(value) => patchFilters({ dateFrom: value })}
            onDateToChange={(value) => patchFilters({ dateTo: value })}
            onHeroChange={(value) => patchFilters({ hero: value })}
            onClear={clearAll}
          />

          {hasDisabledStorages ? (
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
          ) : null}
        </div>

        <StorageTypeFilter
          value={currentCategory}
          categories={categories}
          onChange={handleCategoryChange}
        />

        {currentCategory !== 'all' && storageGroups[currentCategory]?.length > 0 ? (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide pl-1">
            <button
              type="button"
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
                  type="button"
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
          </div>
        ) : null}

        <FilterChips
          chips={activeFilterChips}
          onRemove={(key) => removeFilter(key)}
          onClear={clearAll}
        />

        {/* Level 3: Action Bar */}
        <div className="flex min-h-[40px] items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            {/* Select All Checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectableIds.length > 0 && selectedIds.size === selectableIds.length}
                onChange={toggleSelectAll}
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
              <span className="hidden sm:inline">
                {selectedCount > 0 ? t('library.publish') : t('filters.status.published')}
              </span>
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
              <span className="hidden sm:inline">
                {selectedCount > 0 ? t('library.unpublish') : t('filters.status.unpublished')}
              </span>
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
              <span className="hidden sm:inline">
                {selectedCount > 0 ? t('library.setAsHero') : t('library.hero')}
              </span>
            </Button>

            {selectedCount > 0 && (
              <>
                <div className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  onClick={handleBatchDownload}
                  disabled={isDownloading}
                  title={t('library.downloadSelected')}
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {isDownloading ? t('library.downloading') : t('library.download')}
                  </span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                  onClick={handleBatchDelete}
                  disabled={isDeleting}
                  title={t('library.deleteSelected')}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {isDeleting ? t('library.deleting') : t('library.delete')}
                  </span>
                </Button>

                <div className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => setSelectedIds(new Set())}
                  title={t('library.clearSelection')}
                >
                  <span className="text-xs">{t('filters.clear')}</span>
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
      {isFilterPending ? (
        <MediaLibrarySkeleton />
      ) : (
        <div ref={gridParentRef} className="h-[72vh] overflow-auto">
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const start = virtualRow.index * effectiveColumns;
              const rowItems = items.slice(start, start + effectiveColumns);

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingBottom: `${gap}px`,
                  }}
                >
                  <div
                    className="grid gap-2 h-full"
                    style={{ gridTemplateColumns: `repeat(${effectiveColumns}, minmax(0, 1fr))` }}
                  >
                    {rowItems.map((item) => {
                      const src = resolveMediaSrc(item);
                      const isVideo = item.mediaType === 'video';
                      const isAnimated = item.mediaType === 'animated';
                      const isSelected = selectedIds.has(item.id);
                      const rawTitle = item.title ?? item.path ?? null;
                      const titleText = rawTitle
                        ? resolveMessage(messages, rawTitle)
                        : t('library.unnamed');
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
                          {src ? (
                            <BlurImage
                              src={src}
                              alt={titleText}
                              blurHash={item.blurHash}
                              fill
                              loading="lazy"
                              unoptimized={src.startsWith('/api/')}
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                              className="object-cover transition duration-700 group-hover:scale-110 cursor-zoom-in"
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

                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />

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

                            {isVideo ? (
                              <span className="flex items-center rounded bg-black/50 px-1 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                                VIDEO
                              </span>
                            ) : isAnimated ? (
                              <span className="flex items-center rounded bg-black/50 px-1 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                                GIF
                              </span>
                            ) : null}
                            {heroIdSet.has(item.id) && (
                              <span className="flex items-center rounded-full bg-indigo-500/90 p-1 text-white backdrop-blur-sm">
                                <Sparkles className="h-2 w-2" />
                              </span>
                            )}
                          </div>

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
                </div>
              );
            })}
          </div>
        </div>
      )}


      <Gallery25
        items={galleryItemsForLightbox}
        showGrid={false}
        selectedId={viewingItemId !== null ? String(viewingItemId) : null}
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










