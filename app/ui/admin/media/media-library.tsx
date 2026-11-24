'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useMessages, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import {
  AlertCircle,
  ArrowUpDown,
  Check,
  CheckSquare,
  Cloud,
  Database,
  Download,
  Eye,
  EyeOff,
  Film,
  FolderPlus,
  HardDrive,
  Image as ImageIcon,
  LayoutGrid,
  List,
  MoreHorizontal,
  Server,
  Share2,
  Sparkles,
  Star,
  StarOff,
  Tags,
  Trash2,
  X,
} from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import {
  setAllFilesPublished,
  setFilesPublished,
  setFilteredFilesPublished,
  setHeroPhotos,
  setMediaTags,
} from '@/app/lib/actions';
import type { MediaLibraryItem, MediaLibrarySort } from '@/app/lib/data';
import type { MediaTagUpdateMode } from '@/app/lib/media-tags';
import { resolveMessage } from '@/app/lib/i18n';
import { resolveMediaFullSrc } from '@/app/lib/media-preview';
import { cn } from '@/lib/utils';
import { Gallery25 } from '@/components/gallery25';
import { BlurImage } from '@/app/ui/gallery/blur-image';
import { MediaLibrarySkeleton } from '@/app/ui/components/skeletons';
import { useDebounce } from '@/app/ui/hooks/use-debounce';
import { ListTabs } from '@/app/ui/shared/list-tabs';
import { MediaSearchBar } from './media-search-bar';
import { AdvancedFilterPanel } from './advanced-filter-panel';
import { FilterChips } from './filter-chips';
import { useMediaFilters, type FilterKey } from './use-media-filters';
import {
  AddToCollectionDialog,
  QuickShareDialog,
  type CollectionOption,
} from './media-quick-dialogs';
import {
  showErrorToast,
  showLoadingToast,
  showSuccessToast,
  updateToast,
} from '@/app/lib/batch-operations';

const formatSize = (size: number | null, unknownLabel: string) => {
  if (!size && size !== 0) return unknownLabel;
  if (size < 1024) return `${size} B`;
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
};

const formatResolution = (
  width: number | null,
  height: number | null,
  unknownLabel: string,
) => {
  if (!width || !height) return unknownLabel;
  return `${width}×${height}`;
};

const formatShortDate = (value: Date | string | null | undefined) => {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toISOString().slice(0, 10);
};

// 网格统一走同源缩略图路由，避免混合内容破图
const resolveMediaSrc = (item: MediaLibraryItem) => `/api/media/thumb/${item.id}`;

const clampColumnCount = (value: number) => Math.min(8, Math.max(3, value));

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
  alias?: string | null;
};

type BulkPublishModalState = {
  scope: 'all' | 'filtered';
  publish: boolean;
} | null;

type MediaLibraryManagerProps = {
  items: MediaLibraryItem[];
  heroIds: number[];
  totalCount: number;
  storages?: StorageItem[];
  collections?: CollectionOption[];
  hasFilters?: boolean;
};

export function MediaLibraryManager({
  items,
  heroIds,
  totalCount,
  storages = [],
  collections = [],
  hasFilters = false,
}: MediaLibraryManagerProps) {
  const t = useTranslations('dashboard.media');
  const messages = useMessages();
  const router = useRouter();
  const [, startTransition] = useTransition();

  // 选区与交互模式
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [columnCount, setColumnCount] = useState(5);
  const prefsHydratedRef = useRef(false);

  // 操作与弹窗状态
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [viewingItemId, setViewingItemId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<number[]>([]);
  const [bulkPublishState, setBulkPublishState] = useState<BulkPublishModalState>(null);
  const [isBulkPublishing, setIsBulkPublishing] = useState(false);
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [tagsMode, setTagsMode] = useState<MediaTagUpdateMode>('add');
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // 乐观更新状态
  const [optimisticItems, setOptimisticItems] = useState<MediaLibraryItem[]>(items);
  const [optimisticHeroIds, setOptimisticHeroIds] = useState<number[]>(heroIds);
  const heroIdSet = useMemo(() => new Set(optimisticHeroIds), [optimisticHeroIds]);

  useEffect(() => {
    setOptimisticItems(items);
  }, [items]);

  useEffect(() => {
    setOptimisticHeroIds(heroIds);
  }, [heroIds]);

  // 客户端挂载后再读取本地视图偏好，避免 SSR 水合不一致
  useEffect(() => {
    setColumnCount(readStoredNumber('media-library-columns', 5));
    const storedView = window.localStorage.getItem('media-library-view');
    if (storedView === 'grid' || storedView === 'list') {
      setViewMode(storedView);
    }
    prefsHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!prefsHydratedRef.current) return;
    window.localStorage.setItem('media-library-columns', String(columnCount));
  }, [columnCount]);

  useEffect(() => {
    if (!prefsHydratedRef.current) return;
    window.localStorage.setItem('media-library-view', viewMode);
  }, [viewMode]);

  // 筛选与 URL 同步
  const { filters, isPending: isFilterPending, patchFilters, clearAll, removeFilter } =
    useMediaFilters();
  const [searchInput, setSearchInput] = useState(filters.q);
  const debouncedSearch = useDebounce(searchInput, 300);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    setSearchInput(filters.q);
  }, [filters.q]);

  useEffect(() => {
    if (debouncedSearch !== filters.q) {
      patchFilters({ q: debouncedSearch });
    }
  }, [debouncedSearch, filters.q, patchFilters]);

  // 存储源按类型分组
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

  const categories = useMemo(() => {
    const base = [
      { id: 'all', label: t('filters.type.all'), icon: Database },
      { id: 'local', label: t('storageLabels.local'), icon: HardDrive },
      { id: 'nas', label: t('storageLabels.nas'), icon: Server },
      { id: 's3', label: t('storageLabels.s3'), icon: Cloud },
    ];
    if (storageGroups.qiniu.length > 0) {
      base.push({ id: 'qiniu', label: t('storageLabels.qiniu'), icon: Cloud });
    }
    return base;
  }, [storageGroups.qiniu.length, t]);

  const sortOptions: Array<{ value: MediaLibrarySort; label: string }> = useMemo(
    () => [
      { value: 'dateShotDesc', label: t('sort.dateShotDesc') },
      { value: 'dateShotAsc', label: t('sort.dateShotAsc') },
      { value: 'sizeDesc', label: t('sort.sizeDesc') },
      { value: 'sizeAsc', label: t('sort.sizeAsc') },
      { value: 'resolutionDesc', label: t('sort.resolutionDesc') },
      { value: 'resolutionAsc', label: t('sort.resolutionAsc') },
      { value: 'titleAsc', label: t('sort.titleAsc') },
      { value: 'titleDesc', label: t('sort.titleDesc') },
    ],
    [t],
  );

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: FilterKey; label: string }> = [];
    if (filters.q) chips.push({ key: 'q', label: `${t('filters.search')}: ${filters.q}` });
    if (filters.category !== 'all') {
      chips.push({
        key: 'category',
        label: categories.find((item) => item.id === filters.category)?.label || filters.category,
      });
    }
    if (filters.storageId) {
      const target = storages.find((item) => item.id === filters.storageId);
      const alias = (target?.config as { alias?: string } | undefined)?.alias;
      chips.push({
        key: 'storageId',
        label: alias || (target ? `${target.type.toUpperCase()} #${target.id}` : `ID ${filters.storageId}`),
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
    if (filters.dateFrom) chips.push({ key: 'dateFrom', label: `${t('filters.from')}: ${filters.dateFrom}` });
    if (filters.dateTo) chips.push({ key: 'dateTo', label: `${t('filters.to')}: ${filters.dateTo}` });
    if (filters.hero !== 'all') {
      chips.push({
        key: 'hero',
        label: filters.hero === 'yes' ? t('filters.hero.yes') : t('filters.hero.no'),
      });
    }
    if (filters.orientation !== 'all') {
      chips.push({
        key: 'orientation',
        label: t(`filters.orientation.${filters.orientation}`),
      });
    }
    if (filters.camera) chips.push({ key: 'camera', label: `${t('filters.camera')}: ${filters.camera}` });
    if (filters.lens) chips.push({ key: 'lens', label: `${t('filters.lens')}: ${filters.lens}` });
    if (filters.hasGps !== 'all') {
      chips.push({
        key: 'hasGps',
        label: filters.hasGps === 'yes' ? t('filters.gps.yes') : t('filters.gps.no'),
      });
    }
    return chips;
  }, [categories, filters, storages, t]);

  const advancedStorageOptions = useMemo(() => {
    const source =
      filters.category === 'all' ? storages : storageGroups[filters.category] || [];
    return source.map((item) => ({
      id: item.id,
      label: item.alias || `${item.type.toUpperCase()} #${item.id}`,
    }));
  }, [filters.category, storageGroups, storages]);

  const activeFilterCount = activeFilterChips.length;
  const hasAnyActiveFilter = hasFilters || activeFilterCount > 0;

  const selectableIds = useMemo(
    () => optimisticItems.filter((item) => !item.storage.isDisabled).map((item) => item.id),
    [optimisticItems],
  );

  // 仅保留当前页仍可选的 ID
  useEffect(() => {
    queueMicrotask(() => {
      setSelectedIds((prev) => {
        if (prev.size === 0) return prev;
        const next = new Set<number>();
        prev.forEach((id) => {
          if (selectableIds.includes(id)) next.add(id);
        });
        return next.size === prev.size ? prev : next;
      });
    });
  }, [selectableIds]);

  const selectedCount = selectedIds.size;
  const isAllPageSelected =
    selectableIds.length > 0 && selectedCount === selectableIds.length;
  const selectedArray = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const selectedHasHero = useMemo(
    () => selectedArray.some((id) => heroIdSet.has(id)),
    [heroIdSet, selectedArray],
  );

  const toggleSelect = useCallback(
    (id: number) => {
      if (!selectableIds.includes(id)) return;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [selectableIds],
  );

  // Shift 连选（anchor 模型）
  const lastSelectedIdRef = useRef<number | null>(null);
  const selectMedia = useCallback(
    (id: number, options: { range?: boolean } = {}) => {
      if (!selectableIds.includes(id)) return;
      const anchorId = lastSelectedIdRef.current;

      if (options.range && anchorId != null && selectableIds.includes(anchorId)) {
        const anchorIndex = selectableIds.indexOf(anchorId);
        const currentIndex = selectableIds.indexOf(id);
        const [start, end] =
          anchorIndex <= currentIndex
            ? [anchorIndex, currentIndex]
            : [currentIndex, anchorIndex];
        setSelectedIds(new Set(selectableIds.slice(start, end + 1)));
        lastSelectedIdRef.current = id;
        return;
      }

      toggleSelect(id);
      lastSelectedIdRef.current = id;
    },
    [selectableIds, toggleSelect],
  );

  const toggleSelectAll = useCallback(() => {
    if (isAllPageSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableIds));
    }
  }, [isAllPageSelected, selectableIds]);

  // 网格快捷键：Esc 清空选区，Ctrl/Cmd+A 全选当前页
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        viewingItemId !== null ||
        deleteDialogOpen ||
        tagsDialogOpen ||
        collectionDialogOpen ||
        shareDialogOpen ||
        bulkPublishState !== null ||
        advancedOpen
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (event.key === 'Escape' && selectedCount > 0) {
        setSelectedIds(new Set());
        setSelectionMode(false);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a' && !isEditable) {
        event.preventDefault();
        setSelectedIds(new Set(selectableIds));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    advancedOpen,
    bulkPublishState,
    collectionDialogOpen,
    deleteDialogOpen,
    selectableIds,
    selectedCount,
    shareDialogOpen,
    tagsDialogOpen,
    viewingItemId,
  ]);

  // 单条或选中批量上线/下线（带失败回滚 + Toast）
  const handlePublish = (publish: boolean, targetIds?: number[]) => {
    const idsToUpdate = targetIds || selectedArray;
    if (idsToUpdate.length === 0) {
      showErrorToast(t('library.selectFirst'));
      return;
    }

    const previousItems = optimisticItems;
    setOptimisticItems((prev) =>
      prev.map((item) =>
        idsToUpdate.includes(item.id) ? { ...item, isPublished: publish } : item,
      ),
    );

    startTransition(async () => {
      try {
        const result = await setFilesPublished(idsToUpdate, publish);
        if (!result.success) {
          setOptimisticItems(previousItems);
          showErrorToast(result.message || t('library.bulkPublishFailed'));
          return;
        }
        if (!targetIds) {
          setSelectedIds(new Set());
        }
        showSuccessToast(result.message || t('library.statusUpdated'));
        router.refresh();
      } catch {
        setOptimisticItems(previousItems);
        showErrorToast(t('library.bulkPublishFailed'));
      }
    });
  };

  // 按当前筛选或全库批量上线/下线
  const confirmBulkPublish = () => {
    if (!bulkPublishState) return;
    const { scope, publish } = bulkPublishState;
    setIsBulkPublishing(true);

    startTransition(async () => {
      try {
        const result =
          scope === 'filtered'
            ? await setFilteredFilesPublished(
                {
                  category: filters.category,
                  storageId: filters.storageId,
                  status: filters.status,
                  type: filters.type,
                  q: filters.q,
                  dateFrom: filters.dateFrom,
                  dateTo: filters.dateTo,
                  hero: filters.hero,
                  orientation: filters.orientation,
                  camera: filters.camera,
                  lens: filters.lens,
                  hasGps: filters.hasGps,
                },
                publish,
              )
            : await setAllFilesPublished(publish);

        if (result.success) {
          setOptimisticItems((prev) =>
            prev.map((item) =>
              item.storage.isDisabled ? item : { ...item, isPublished: publish },
            ),
          );
          setSelectedIds(new Set());
          showSuccessToast(
            t(publish ? 'library.bulkPublishSuccess' : 'library.bulkUnpublishSuccess', {
              count: result.count ?? 0,
            }),
          );
        } else {
          showErrorToast(result.message || t('library.bulkPublishFailed'));
        }
      } catch {
        showErrorToast(t('library.bulkPublishFailed'));
      } finally {
        setIsBulkPublishing(false);
        setBulkPublishState(null);
        router.refresh();
      }
    });
  };

  const handleHero = (isHero: boolean, targetIds?: number[]) => {
    const idsToUpdate = targetIds || selectedArray;
    if (idsToUpdate.length === 0) {
      showErrorToast(t('library.selectFirst'));
      return;
    }

    const previousHeroIds = optimisticHeroIds;
    if (isHero) {
      setOptimisticHeroIds((prev) => Array.from(new Set([...prev, ...idsToUpdate])));
    } else {
      setOptimisticHeroIds((prev) => prev.filter((id) => !idsToUpdate.includes(id)));
    }

    startTransition(async () => {
      try {
        const result = await setHeroPhotos(idsToUpdate, isHero);
        if (!result.success) {
          setOptimisticHeroIds(previousHeroIds);
          showErrorToast(result.message || t('library.bulkPublishFailed'));
          return;
        }
        if (!targetIds) {
          setSelectedIds(new Set());
        }
        showSuccessToast(result.message || t('library.statusUpdated'));
        router.refresh();
      } catch {
        setOptimisticHeroIds(previousHeroIds);
        showErrorToast(t('library.bulkPublishFailed'));
      }
    });
  };

  const handleBatchDelete = (targetIds?: number[]) => {
    const idsToDelete = targetIds || selectedArray;
    if (idsToDelete.length === 0) {
      showErrorToast(t('library.selectFirst'));
      return;
    }
    setDeleteTargetIds(idsToDelete);
    setDeleteDialogOpen(true);
  };

  const confirmBatchDelete = async () => {
    if (deleteTargetIds.length === 0) {
      setDeleteDialogOpen(false);
      return;
    }

    const toastId = showLoadingToast(t('library.deleting'));
    setIsDeleting(true);
    setDeleteDialogOpen(false);

    const previousItems = optimisticItems;
    setOptimisticItems((prev) => prev.filter((item) => !deleteTargetIds.includes(item.id)));

    try {
      const { moveMediaToTrash } = await import('@/app/lib/actions');
      const result = await moveMediaToTrash(deleteTargetIds);
      if (result.success) {
        setSelectedIds(new Set());
        setDeleteTargetIds([]);
        router.refresh();
        updateToast(toastId, 'success', result.message || t('library.deleteSuccess'));
      } else {
        setOptimisticItems(previousItems);
        updateToast(toastId, 'error', result.message || t('library.deleteFailed'));
      }
    } catch {
      setOptimisticItems(previousItems);
      updateToast(toastId, 'error', t('library.deleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBatchTags = () => {
    if (selectedArray.length === 0) {
      showErrorToast(t('library.selectFirst'));
      return;
    }

    const tags = tagsInput
      .split(/[,，;；\s]+/)
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (tags.length === 0 && tagsMode !== 'replace') {
      showErrorToast(t('library.tagsEmpty'));
      return;
    }

    startTransition(async () => {
      try {
        const result = await setMediaTags(selectedArray, tags, tagsMode);
        if (result.success) {
          showSuccessToast(result.message || t('library.tagsSuccess'));
          setTagsDialogOpen(false);
          setTagsInput('');
          router.refresh();
        } else {
          showErrorToast(result.message || t('library.tagsFailed'));
        }
      } catch {
        showErrorToast(t('library.tagsFailed'));
      }
    });
  };

  const handleBatchDownload = async () => {
    if (selectedArray.length === 0) {
      showErrorToast(t('library.selectFirst'));
      return;
    }

    setIsDownloading(true);
    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: selectedArray }),
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="?(.+)"?/i);
      a.download = filenameMatch ? filenameMatch[1] : `media_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSelectedIds(new Set());
      showSuccessToast(t('library.downloadSuccess'));
    } catch {
      showErrorToast(t('library.downloadFailed'));
    } finally {
      setIsDownloading(false);
    }
  };

  const hasDisabledStorages = useMemo(
    () => storages.some((s) => (s.config as { isDisabled?: boolean } | null)?.isDisabled),
    [storages],
  );

  // 灯箱数据映射
  const galleryItemsForLightbox = useMemo(() => {
    return optimisticItems.map((item) => {
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
        id: String(item.id),
        type: (item.mediaType === 'video' ? 'video' : 'photo') as 'video' | 'photo',
        src: resolveMediaSrc(item),
        fullSrc: resolveMediaFullSrc(item),
        videoUrl: item.mediaType === 'video' ? `/api/media/stream/${item.id}` : null,
        animatedUrl: isAnimated ? `/api/local-files/${item.id}` : null,
        isAnimated,
        duration: item.videoDuration ?? null,
        liveType: (item.liveType as 'none' | 'embedded' | 'paired') ?? 'none',
        title: titleText,
        description: item.description ?? null,
        author: item.author ?? null,
        tags: item.tags ?? [],
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
  }, [messages, optimisticItems, t]);

  const gridStyle = useMemo(
    () => ({
      gridTemplateColumns: undefined,
    }),
    [],
  );

  const gridColumnClass = useMemo(() => {
    switch (columnCount) {
      case 3:
        return 'grid-cols-2 sm:grid-cols-3';
      case 4:
        return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
      case 5:
        return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
      case 6:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
      case 7:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7';
      default:
        return 'grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8';
    }
  }, [columnCount]);

  return (
    <TooltipProvider delayDuration={250}>
      <div className="space-y-4">
        {/* 吸顶主筛选与视图工作栏 */}
        <div className="sticky top-14 z-10 -mx-1 space-y-3 rounded-2xl border border-zinc-200/80 bg-white/85 p-3 shadow-sm backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-900/80">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="min-w-[220px] flex-1">
              <MediaSearchBar
                value={searchInput}
                placeholder={t('filters.searchPlaceholder')}
                onChange={setSearchInput}
                onClear={() => setSearchInput('')}
                clearAriaLabel={t('filters.clear')}
              />
            </div>

            {/* 一级发布态快速分段 */}
            <div className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100/80 p-0.5 dark:border-zinc-800 dark:bg-zinc-950/60">
              {(['all', 'published', 'unpublished'] as const).map((statusKey) => {
                const active = filters.status === statusKey;
                return (
                  <button
                    key={statusKey}
                    type="button"
                    onClick={() => patchFilters({ status: statusKey })}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      active
                        ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                        : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
                    )}
                  >
                    {t(`filters.status.${statusKey}`)}
                  </button>
                );
              })}
            </div>

            {/* 8 种排序下拉 */}
            <Select
              value={filters.sort}
              onValueChange={(value) => patchFilters({ sort: value as MediaLibrarySort })}
            >
              <SelectTrigger className="h-9 w-[150px] rounded-full border-zinc-200 bg-white/80 text-xs dark:border-zinc-800 dark:bg-zinc-900/70">
                <div className="flex items-center gap-1.5 truncate">
                  <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 高级筛选抽屉 */}
            <AdvancedFilterPanel
              open={advancedOpen}
              activeCount={activeFilterCount}
              storageOptions={advancedStorageOptions}
              filters={{
                storageId: filters.storageId,
                status: filters.status,
                type: filters.type,
                dateFrom: filters.dateFrom,
                dateTo: filters.dateTo,
                hero: filters.hero,
                orientation: filters.orientation,
                camera: filters.camera,
                lens: filters.lens,
                hasGps: filters.hasGps,
              }}
              onOpenChange={setAdvancedOpen}
              onApply={(next) => patchFilters(next)}
              onClear={clearAll}
            />

            {/* 网格 / 列表双视图切换 */}
            <div className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100/80 p-0.5 dark:border-zinc-800 dark:bg-zinc-950/60">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title={t('library.gridView')}
                className={cn(
                  'rounded-full p-1.5 transition-colors',
                  viewMode === 'grid'
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400',
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                title={t('library.listView')}
                className={cn(
                  'rounded-full p-1.5 transition-colors',
                  viewMode === 'list'
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400',
                )}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* 批量作用域操作（筛选全部 / 全库） */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 rounded-full border-zinc-200 bg-white/80 px-3 text-xs dark:border-zinc-800 dark:bg-zinc-900/70"
                  disabled={isBulkPublishing}
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('library.bulkActions')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {hasAnyActiveFilter && totalCount > 0 ? (
                  <>
                    <DropdownMenuItem
                      onSelect={() => setBulkPublishState({ scope: 'filtered', publish: true })}
                    >
                      <Eye className="mr-2 h-4 w-4 text-emerald-500" />
                      {t('library.publishFiltered', { count: totalCount })}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setBulkPublishState({ scope: 'filtered', publish: false })}
                    >
                      <EyeOff className="mr-2 h-4 w-4 text-zinc-500" />
                      {t('library.unpublishFiltered', { count: totalCount })}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                ) : null}
                <DropdownMenuItem
                  onSelect={() => setBulkPublishState({ scope: 'all', publish: true })}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {t('library.publishAll')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setBulkPublishState({ scope: 'all', publish: false })}
                >
                  <EyeOff className="mr-2 h-4 w-4" />
                  {t('library.unpublishAll')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 第二行：来源分类 + 实例胶囊 + 全选/密度/多选模式 */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-2.5 dark:border-zinc-800/80">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <ListTabs
                size="sm"
                items={categories.map((category) => ({
                  value: category.id,
                  label: category.label,
                  icon: category.icon,
                }))}
                value={filters.category}
                onChange={(category) => patchFilters({ category })}
                ariaLabel={t('filters.source')}
                className="pb-0"
              />

              {filters.category !== 'all' && storageGroups[filters.category]?.length > 0 ? (
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => patchFilters({ storageId: null })}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                      filters.storageId === null
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-300'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400',
                    )}
                  >
                    {t('filters.allInstances')}
                  </button>
                  {storageGroups[filters.category].map((storage) => {
                    const isActive = filters.storageId === storage.id;
                    return (
                      <button
                        key={storage.id}
                        type="button"
                        onClick={() => patchFilters({ storageId: storage.id })}
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
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
            </div>

            <div className="flex items-center gap-2.5 text-xs text-zinc-500 dark:text-zinc-400">
              {hasDisabledStorages ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex cursor-help items-center justify-center rounded-full bg-amber-50 p-1.5 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                      <AlertCircle className="h-3.5 w-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p className="max-w-xs text-xs">{t('disabledWarning')}</p>
                  </TooltipContent>
                </Tooltip>
              ) : null}

              {viewMode === 'grid' ? (
                <label className="hidden items-center gap-1.5 lg:flex">
                  <span>{t('library.columns.label')}</span>
                  <input
                    type="range"
                    min={3}
                    max={8}
                    step={1}
                    value={columnCount}
                    onChange={(event) =>
                      setColumnCount(clampColumnCount(Number(event.target.value)))
                    }
                    className="h-1 w-20 cursor-pointer accent-indigo-500"
                    aria-label={t('library.columns.aria')}
                  />
                  <span className="font-mono tabular-nums">{columnCount}</span>
                </label>
              ) : null}

              <Button
                type="button"
                variant={selectionMode ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 gap-1.5 rounded-full px-2.5 text-xs"
                onClick={() => {
                  if (selectionMode) {
                    setSelectionMode(false);
                    setSelectedIds(new Set());
                  } else {
                    setSelectionMode(true);
                  }
                }}
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span>{selectionMode ? t('library.exitSelectMode') : t('library.selectMode')}</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 rounded-full px-2.5 text-xs"
                onClick={toggleSelectAll}
                disabled={selectableIds.length === 0}
              >
                {isAllPageSelected ? t('library.unselectPage') : t('library.selectAllPage')}
              </Button>
            </div>
          </div>

          {activeFilterChips.length > 0 ? (
            <FilterChips
              chips={activeFilterChips}
              onRemove={(key) => removeFilter(key)}
              onClear={clearAll}
            />
          ) : null}
        </div>

        {/* Gmail 式跨页全选匹配项提示条 */}
        {isAllPageSelected && totalCount > selectableIds.length ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-2.5 text-xs text-indigo-900 dark:border-indigo-500/30 dark:bg-indigo-950/40 dark:text-indigo-200">
            <span>
              {t('library.pageSelectedBanner', {
                pageCount: selectableIds.length,
                totalCount,
              })}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 rounded-full border-indigo-300 bg-white/80 text-xs text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-950 dark:text-indigo-200"
                onClick={() =>
                  setBulkPublishState({
                    scope: hasAnyActiveFilter ? 'filtered' : 'all',
                    publish: true,
                  })
                }
              >
                {t('library.publishFiltered', { count: totalCount })}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 rounded-full border-indigo-300 bg-white/80 text-xs text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-950 dark:text-indigo-200"
                onClick={() =>
                  setBulkPublishState({
                    scope: hasAnyActiveFilter ? 'filtered' : 'all',
                    publish: false,
                  })
                }
              >
                {t('library.unpublishFiltered', { count: totalCount })}
              </Button>
            </div>
          </div>
        ) : null}

        {/* 主内容区（自然页面滚动，无嵌套双滚动条） */}
        {isFilterPending ? (
          <MediaLibrarySkeleton />
        ) : optimisticItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/70 p-12 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
            <p>{hasAnyActiveFilter ? t('empty.noMatches') : t('empty.noContent')}</p>
            <div className="mt-4 flex justify-center gap-3">
              {hasAnyActiveFilter ? (
                <Button type="button" variant="ghost" onClick={clearAll}>
                  {t('filters.clear')}
                </Button>
              ) : null}
              <Button asChild variant="outline">
                <Link href="/dashboard/storage">{t('empty.goToStorage')}</Link>
              </Button>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          /* 列表 / 表格视图 */
          <div className="overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white/80 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      aria-label={t('library.selectAllPage')}
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded border transition-colors',
                        isAllPageSelected
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900',
                      )}
                    >
                      {isAllPageSelected ? <Check className="h-3 w-3" /> : null}
                    </button>
                  </TableHead>
                  <TableHead>{t('library.table.media')}</TableHead>
                  <TableHead>{t('library.table.status')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('library.table.specs')}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t('library.table.date')}</TableHead>
                  <TableHead className="hidden xl:table-cell">{t('library.table.tags')}</TableHead>
                  <TableHead className="text-right">{t('library.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {optimisticItems.map((item) => {
                  const src = resolveMediaSrc(item);
                  const isSelected = selectedIds.has(item.id);
                  const isHero = heroIdSet.has(item.id);
                  const rawTitle = item.title ?? item.path ?? null;
                  const titleText = rawTitle
                    ? resolveMessage(messages, rawTitle)
                    : t('library.unnamed');
                  const resolutionText = formatResolution(
                    item.resolutionWidth ?? item.videoWidth,
                    item.resolutionHeight ?? item.videoHeight,
                    '—',
                  );
                  const sizeText = formatSize(item.size ?? null, '—');

                  return (
                    <TableRow
                      key={item.id}
                      className={cn(
                        isSelected && 'bg-indigo-50/50 dark:bg-indigo-950/20',
                        item.storage.isDisabled && 'opacity-60',
                      )}
                    >
                      <TableCell>
                        <button
                          type="button"
                          disabled={item.storage.isDisabled}
                          onClick={(e) => selectMedia(item.id, { range: e.shiftKey })}
                          className={cn(
                            'flex h-4 w-4 items-center justify-center rounded border transition-colors',
                            isSelected
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900',
                          )}
                        >
                          {isSelected ? <Check className="h-3 w-3" /> : null}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setViewingItemId(item.id)}
                            className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800"
                          >
                            <BlurImage
                              src={src}
                              alt={titleText}
                              blurHash={item.blurHash}
                              fill
                              unoptimized
                              sizes="48px"
                              className="object-cover"
                            />
                          </button>
                          <div className="min-w-0 max-w-[260px]">
                            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {titleText}
                            </p>
                            <p className="truncate font-mono text-[11px] text-zinc-400">
                              {item.storage.alias || item.storage.type.toUpperCase()} · {item.path}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={item.isPublished}
                            disabled={item.storage.isDisabled}
                            onCheckedChange={(checked) => handlePublish(checked, [item.id])}
                            aria-label={
                              item.isPublished ? t('library.unpublish') : t('library.publish')
                            }
                          />
                          <span
                            className={cn(
                              'text-xs font-medium',
                              item.isPublished
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-zinc-500 dark:text-zinc-400',
                            )}
                          >
                            {item.isPublished ? t('library.published') : t('library.unpublished')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden font-mono text-xs tabular-nums text-zinc-600 dark:text-zinc-300 md:table-cell">
                        <div>{resolutionText}</div>
                        <div className="text-[11px] text-zinc-400">{sizeText}</div>
                      </TableCell>
                      <TableCell className="hidden font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400 lg:table-cell">
                        {formatShortDate(item.dateShot ?? item.mtime ?? item.createdAt)}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <div className="flex max-w-[180px] flex-wrap gap-1">
                          {(item.tags ?? []).slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn(
                              'h-8 w-8',
                              isHero ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400',
                            )}
                            disabled={item.storage.isDisabled}
                            onClick={() => handleHero(!isHero, [item.id])}
                            title={isHero ? t('library.unsetHero') : t('library.setAsHero')}
                          >
                            <Star className={cn('h-4 w-4', isHero && 'fill-current')} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-500"
                            onClick={() => setViewingItemId(item.id)}
                            title={t('library.view')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-500 hover:text-rose-600"
                            disabled={item.storage.isDisabled}
                            onClick={() => handleBatchDelete([item.id])}
                            title={t('library.delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          /* 网格视图（自然页面滚动，清晰状态胶囊一键上下线） */
          <div className={cn('grid gap-3', gridColumnClass)} style={gridStyle}>
            {optimisticItems.map((item) => {
              const src = resolveMediaSrc(item);
              const isVideo = item.mediaType === 'video';
              const isAnimated = item.mediaType === 'animated';
              const isLive = item.liveType === 'embedded' || item.liveType === 'paired';
              const isSelected = selectedIds.has(item.id);
              const isHero = heroIdSet.has(item.id);
              const rawTitle = item.title ?? item.path ?? null;
              const titleText = rawTitle
                ? resolveMessage(messages, rawTitle)
                : t('library.unnamed');
              const resolutionText = formatResolution(
                item.resolutionWidth ?? item.videoWidth,
                item.resolutionHeight ?? item.videoHeight,
                '',
              );
              const sizeText = formatSize(item.size ?? null, '');

              return (
                <ContextMenu key={item.id}>
                  <ContextMenuTrigger asChild>
                    <div
                      className={cn(
                        'group relative aspect-square overflow-hidden rounded-xl border border-zinc-200/70 bg-zinc-100 transition-all dark:border-zinc-800/70 dark:bg-zinc-900',
                        isSelected &&
                          'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-zinc-950',
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
                          unoptimized
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                          className={cn(
                            'object-cover transition duration-500',
                            selectionMode ? 'cursor-pointer' : 'cursor-zoom-in group-hover:scale-105',
                          )}
                          onClick={(e) => {
                            if (selectionMode || selectedCount > 0 && e.shiftKey) {
                              selectMedia(item.id, { range: e.shiftKey });
                              return;
                            }
                            setViewingItemId(item.id);
                          }}
                        />
                      ) : (
                        <div
                          className="flex h-full w-full cursor-zoom-in items-center justify-center text-zinc-400"
                          onClick={() => setViewingItemId(item.id)}
                        >
                          {isVideo ? (
                            <Film className="h-8 w-8" />
                          ) : (
                            <ImageIcon className="h-8 w-8" />
                          )}
                        </div>
                      )}

                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-950/15 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

                      {/* 左上角：清晰状态胶囊，点击直接切换上线/下线 */}
                      <div className="absolute left-2 top-2 z-10 flex items-center gap-1">
                        <button
                          type="button"
                          disabled={item.storage.isDisabled}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePublish(!item.isPublished, [item.id]);
                          }}
                          title={
                            item.isPublished
                              ? t('library.clickToUnpublish')
                              : t('library.clickToPublish')
                          }
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium shadow-sm backdrop-blur-md transition-transform active:scale-95',
                            item.isPublished
                              ? 'bg-emerald-500/90 text-white hover:bg-emerald-600'
                              : 'bg-zinc-900/75 text-zinc-100 hover:bg-zinc-900',
                          )}
                        >
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              item.isPublished ? 'bg-white' : 'bg-zinc-400',
                            )}
                          />
                          <span>
                            {item.isPublished ? t('library.published') : t('library.unpublished')}
                          </span>
                        </button>

                        {isHero ? (
                          <span
                            className="inline-flex items-center rounded-full bg-indigo-600/90 p-1 text-white shadow-sm backdrop-blur-md"
                            title={t('library.hero')}
                          >
                            <Sparkles className="h-2.5 w-2.5" />
                          </span>
                        ) : null}
                      </div>

                      {/* 右上角：勾选按钮（选中/多选模式常驻，桌面 hover 显示） */}
                      <button
                        type="button"
                        disabled={item.storage.isDisabled}
                        onClick={(e) => {
                          e.stopPropagation();
                          selectMedia(item.id, { range: e.shiftKey });
                        }}
                        title={t('library.shiftRangeHint')}
                        className={cn(
                          'absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border shadow-sm backdrop-blur-md transition-all',
                          isSelected
                            ? 'border-indigo-500 bg-indigo-600 text-white opacity-100'
                            : selectionMode
                              ? 'border-white/70 bg-zinc-900/50 text-transparent opacity-100 hover:border-white'
                              : 'border-white/70 bg-zinc-900/50 text-transparent opacity-0 hover:border-white group-hover:opacity-100',
                        )}
                      >
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      </button>

                      {/* 左下角类型角标 + 悬停信息 */}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2.5 text-white">
                        <div className="mb-1 flex items-center gap-1">
                          {isVideo ? (
                            <span className="rounded bg-zinc-950/70 px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-sm">
                              {t('filters.type.video')}
                            </span>
                          ) : isAnimated ? (
                            <span className="rounded bg-zinc-950/70 px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-sm">
                              {t('filters.type.animated')}
                            </span>
                          ) : isLive ? (
                            <span className="rounded bg-amber-500/85 px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-sm">
                              LIVE
                            </span>
                          ) : null}
                        </div>
                        <div className="opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          <p className="truncate text-xs font-medium leading-tight">{titleText}</p>
                          <div className="mt-0.5 flex items-center justify-between font-mono text-[10px] text-white/75 tabular-nums">
                            <span>{resolutionText}</span>
                            <span>{sizeText}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-52">
                    <ContextMenuItem onClick={() => setViewingItemId(item.id)}>
                      <Eye className="mr-2 h-4 w-4" />
                      {t('library.view')}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={() => handlePublish(!item.isPublished, [item.id])}
                      disabled={item.storage.isDisabled}
                    >
                      {item.isPublished ? (
                        <>
                          <EyeOff className="mr-2 h-4 w-4" />
                          {t('library.unpublish')}
                        </>
                      ) : (
                        <>
                          <Eye className="mr-2 h-4 w-4" />
                          {t('library.publish')}
                        </>
                      )}
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => handleHero(!isHero, [item.id])}
                      disabled={item.storage.isDisabled}
                    >
                      <Star className="mr-2 h-4 w-4" />
                      {isHero ? t('library.unsetHero') : t('library.setAsHero')}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={() => handleBatchDelete([item.id])}
                      className="text-rose-600 focus:text-rose-600 dark:text-rose-400"
                      disabled={item.storage.isDisabled}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('library.delete')}
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </div>
        )}

        {/* 底部居中悬浮批量操作 Dock（仅选中时出现） */}
        {selectedCount > 0 ? (
          <div className="fixed bottom-5 left-1/2 z-30 w-[calc(100vw-2rem)] max-w-4xl -translate-x-1/2">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-200/80 bg-zinc-900/95 px-3.5 py-2.5 text-white shadow-2xl backdrop-blur-xl dark:border-zinc-700/80 dark:bg-zinc-900/95">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-indigo-500 px-2 font-mono text-xs font-semibold tabular-nums text-white">
                  {selectedCount}
                </span>
                <span className="hidden text-xs font-medium text-zinc-200 sm:inline">
                  {t('library.selectedCount', { count: selectedCount })}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1.5 rounded-full text-xs text-emerald-300 hover:bg-white/10 hover:text-emerald-200"
                  onClick={() => handlePublish(true)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>{t('library.publish')}</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1.5 rounded-full text-xs text-zinc-200 hover:bg-white/10 hover:text-white"
                  onClick={() => handlePublish(false)}
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  <span>{t('library.unpublish')}</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1.5 rounded-full text-xs text-zinc-200 hover:bg-white/10 hover:text-white"
                  onClick={() => setCollectionDialogOpen(true)}
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{t('library.addToCollection')}</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1.5 rounded-full text-xs text-zinc-200 hover:bg-white/10 hover:text-white"
                  onClick={() => setShareDialogOpen(true)}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{t('library.createShare')}</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1.5 rounded-full text-xs text-zinc-200 hover:bg-white/10 hover:text-white"
                  onClick={() => setTagsDialogOpen(true)}
                >
                  <Tags className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">{t('library.tags')}</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1.5 rounded-full text-xs text-zinc-200 hover:bg-white/10 hover:text-white"
                  onClick={() => handleHero(!selectedHasHero)}
                  title={selectedHasHero ? t('library.unsetHero') : t('library.setAsHero')}
                >
                  {selectedHasHero ? (
                    <StarOff className="h-3.5 w-3.5" />
                  ) : (
                    <Star className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden xl:inline">
                    {selectedHasHero ? t('library.unsetHero') : t('library.setAsHero')}
                  </span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1.5 rounded-full text-xs text-zinc-200 hover:bg-white/10 hover:text-white"
                  onClick={handleBatchDownload}
                  disabled={isDownloading}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline">
                    {isDownloading ? t('library.downloading') : t('library.download')}
                  </span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1.5 rounded-full text-xs text-rose-400 hover:bg-rose-500/20 hover:text-rose-300"
                  onClick={() => handleBatchDelete()}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{t('library.delete')}</span>
                </Button>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full text-zinc-400 hover:bg-white/10 hover:text-white"
                  onClick={() => setSelectedIds(new Set())}
                  title={t('library.clearSelection')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {/* 批量上下线确认弹窗（支持“当前筛选”和“全库”） */}
        <AlertDialog
          open={bulkPublishState !== null}
          onOpenChange={(open) => {
            if (!open && !isBulkPublishing) setBulkPublishState(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {bulkPublishState?.scope === 'filtered'
                  ? t(
                      bulkPublishState.publish
                        ? 'library.publishFilteredTitle'
                        : 'library.unpublishFilteredTitle',
                    )
                  : t(
                      bulkPublishState?.publish
                        ? 'library.publishAllTitle'
                        : 'library.unpublishAllTitle',
                    )}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {bulkPublishState?.scope === 'filtered'
                  ? t(
                      bulkPublishState.publish
                        ? 'library.publishFilteredDesc'
                        : 'library.unpublishFilteredDesc',
                      { count: totalCount },
                    )
                  : t(
                      bulkPublishState?.publish
                        ? 'library.publishAllDesc'
                        : 'library.unpublishAllDesc',
                    )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isBulkPublishing}>
                {t('library.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  confirmBulkPublish();
                }}
                disabled={isBulkPublishing}
              >
                {isBulkPublishing
                  ? t('library.bulkUpdating')
                  : t('library.confirmBulkAction')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 移入回收站确认弹窗 */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('library.deleteSelected')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('library.moveToTrashConfirm', { count: deleteTargetIds.length })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
                {t('library.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmBatchDelete}
                disabled={isDeleting}
                className="bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-600"
              >
                {isDeleting ? t('library.deleting') : t('library.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 批量标签弹窗（支持 追加/替换/移除） */}
        <Dialog open={tagsDialogOpen} onOpenChange={setTagsDialogOpen}>
          <DialogContent className="rounded-2xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {t('library.tagsDialogTitle', { count: selectedIds.size })}
              </DialogTitle>
              <DialogDescription>{t('library.tagsDialogHint')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div className="inline-flex rounded-full border border-zinc-200 bg-zinc-100/80 p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
                {(['add', 'replace', 'remove'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTagsMode(mode)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      tagsMode === mode
                        ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                        : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400',
                    )}
                  >
                    {t(`library.tagsMode.${mode}`)}
                  </button>
                ))}
              </div>
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder={t('library.tagsPlaceholder')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleBatchTags();
                  }
                }}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setTagsDialogOpen(false)}>
                {t('library.cancel')}
              </Button>
              <Button
                className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                onClick={handleBatchTags}
              >
                {t('library.tagsApply')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 加入作品集弹窗 */}
        <AddToCollectionDialog
          open={collectionDialogOpen}
          onOpenChange={setCollectionDialogOpen}
          fileIds={selectedArray}
          collections={collections}
          onSuccess={() => {
            setSelectedIds(new Set());
            router.refresh();
          }}
        />

        {/* 快捷创建外链分享弹窗 */}
        <QuickShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          fileIds={selectedArray}
          onSuccess={() => {
            setSelectedIds(new Set());
          }}
        />

        {/* 自适应灯箱预览 */}
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
        />
      </div>
    </TooltipProvider>
  );
}
