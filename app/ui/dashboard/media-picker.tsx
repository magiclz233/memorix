import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchMediaForPicker } from '@/app/lib/actions/unified-collections';
import {
  Loader2,
  Check,
  ImageIcon,
  Search,
  Filter,
  CheckSquare,
  Square,
  X,
  PlusCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/app/ui/hooks/use-debounce';
import { useIsMobile } from '@/app/ui/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';

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
  const isMobile = useIsMobile();
  
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [filterType, setFilterType] = useState<string>('all');

  const disabledSet = new Set(disabledIds);
  const t = useTranslations('dashboard.collections.picker');

  const loadMedia = useCallback(async (isNewSearch = false) => {
    setIsLoading(true);
    const currentPage = isNewSearch ? 1 : page;
    
    try {
      const newItems = (await fetchMediaForPicker(
        currentPage,
        24,
        filterType === 'all' 
          ? allowedMediaTypes 
          : [filterType as any],
      )) as unknown as MediaItem[];

      if (newItems.length < 24) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      setItems((prev) => {
        if (isNewSearch) return newItems;
        const existing = new Set(prev.map((item) => item.id));
        const filtered = newItems.filter((item) => !existing.has(item.id));
        return [...prev, ...filtered];
      });
      
      setPage(currentPage + 1);
    } catch (error) {
      console.error('Failed to load media:', error);
    } finally {
      setIsLoading(false);
    }
  }, [allowedMediaTypes, filterType, page]);

  useEffect(() => {
    loadMedia(true);
  }, [debouncedSearch, filterType]);

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

  const handleSelectPage = () => {
    const pageIds = items
      .filter(item => !disabledSet.has(item.id))
      .map(item => item.id);
    
    setSelectedIds(prev => {
      const next = new Set([...prev, ...pageIds]);
      if (maxSelect) {
        return Array.from(next).slice(0, maxSelect);
      }
      return Array.from(next);
    });
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
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
    <div className="flex h-full flex-col bg-white dark:bg-zinc-950">
      {/* Search & Filter Header */}
      <div className={cn(
        "flex flex-col gap-3 border-b border-zinc-100 p-4 dark:border-zinc-900",
        isMobile ? "sticky top-0 z-10 bg-white/90 backdrop-blur-md dark:bg-zinc-950/90" : "sm:flex-row sm:items-center"
      )}>
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="pl-11 pr-11 rounded-2xl bg-zinc-50 border-transparent focus:bg-white dark:bg-zinc-900"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <div className="flex items-center justify-between gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[120px] rounded-xl border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 sm:w-[150px]">
              <div className="flex items-center truncate">
                <Filter className="mr-2 h-3.5 w-3.5 shrink-0" />
                <SelectValue placeholder={t('filterAll')} />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">{t('filterAll')}</SelectItem>
              <SelectItem value="image">{t('filterPhoto')}</SelectItem>
              <SelectItem value="video">{t('filterVideo')}</SelectItem>
            </SelectContent>
          </Select>

          {selectionMode === 'multiple' && (
            <div className="flex items-center gap-1">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleSelectPage}
                            className="rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900"
                        >
                            <CheckSquare className="h-4 w-4" />
                            {isMobile && <span className="ml-2 text-xs">{t('selectAll')}</span>}
                        </Button>
                    </TooltipTrigger>
                    {!isMobile && <TooltipContent>{t('selectAll')}</TooltipContent>}
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleClearSelection}
                            className="rounded-full text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                        >
                            <Square className="h-4 w-4" />
                            {isMobile && <span className="ml-2 text-xs">{t('clearSelection')}</span>}
                        </Button>
                    </TooltipTrigger>
                    {!isMobile && <TooltipContent>{t('clearSelection')}</TooltipContent>}
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-zinc-50/30 dark:bg-zinc-900/10">
        <AnimatePresence mode="wait">
          {items.length === 0 && !isLoading ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex h-64 flex-col items-center justify-center text-zinc-400"
            >
              <div className="mb-4 rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
                <ImageIcon className="h-8 w-8 opacity-40" />
              </div>
              <p className="text-sm font-medium">{t('noMatches')}</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 pb-12">
              {items.map((item, index) => {
                const isSelected = selectedIds.includes(item.id);
                const isDisabled = disabledSet.has(item.id);
                const mediaSrc = item.thumbUrl || item.url;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: Math.min(index * 0.02, 0.2) }}
                    className={cn(
                      'group relative aspect-square overflow-hidden rounded-2xl border-2 transition-all duration-300',
                      isSelected
                        ? 'border-indigo-500 shadow-xl shadow-indigo-500/10'
                        : 'border-transparent bg-white dark:bg-zinc-900 shadow-sm',
                      isDisabled ? 'cursor-not-allowed grayscale' : 'cursor-pointer hover:shadow-md'
                    )}
                    onClick={() => !isDisabled && toggleSelection(item.id)}
                  >
                    {mediaSrc ? (
                      <Image
                        src={mediaSrc}
                        alt={item.title || ''}
                        fill
                        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 15vw"
                        className={cn(
                          "object-cover transition-all duration-500",
                          isSelected ? "scale-90 rounded-xl" : "group-hover:scale-110"
                        )}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-200 dark:text-zinc-800">
                        <ImageIcon className="h-8 w-8" />
                      </div>
                    )}
                    
                    {/* Item Status Overlay */}
                    <div className={cn(
                      "absolute inset-0 flex items-center justify-center transition-all duration-300",
                      isSelected ? "bg-indigo-500/5 backdrop-blur-[1px]" : "bg-transparent group-hover:bg-black/5"
                    )}>
                      {isSelected && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg ring-4 ring-white dark:ring-zinc-900"
                        >
                          <Check className="h-6 w-6 stroke-[3]" />
                        </motion.div>
                      )}
                    </div>

                    {/* Media Type Badge */}
                    {item.mediaType === 'video' && (
                      <div className="absolute right-3 top-3 rounded-lg bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                        MOV
                      </div>
                    )}
                    
                    {isDisabled && (
                       <div className="absolute inset-x-0 bottom-0 bg-zinc-900/60 p-1.5 text-center text-[10px] font-bold uppercase text-white backdrop-blur-md">
                           {t('alreadyInCollection') || 'Added'}
                       </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
        
        {isLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 py-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
            ))}
          </div>
        )}
        
        {!isLoading && hasMore && items.length > 0 && (
          <div className="mt-8 flex justify-center pb-20">
            <Button 
                variant="outline" 
                size="lg"
                onClick={() => loadMedia()}
                className="rounded-full px-10 shadow-sm transition-all hover:shadow-md dark:border-zinc-800"
            >
              {t('loadMore')}
            </Button>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-zinc-100 bg-white/95 p-5 backdrop-blur-xl dark:border-zinc-900 dark:bg-zinc-950/95 sticky bottom-0 z-20">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-indigo-500" />
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {t('selected', { count: selectedIds.length })}
                </p>
            </div>
            {maxSelect && (
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                Limit {maxSelect}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button 
                variant="ghost" 
                onClick={onCancel} 
                disabled={isPending}
                className="rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 sm:px-6"
            >
              {t('cancel')}
            </Button>
            <Button 
                onClick={handleConfirm} 
                disabled={selectedIds.length === 0 || isPending}
                className="relative h-11 min-w-[120px] rounded-full bg-indigo-600 px-8 font-bold shadow-xl shadow-indigo-500/20 transition-all hover:bg-indigo-700 hover:shadow-indigo-500/30"
            >
              {isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <div className="flex items-center">
                    <Check className="mr-2 h-4 w-4 stroke-[3]" />
                    {t('confirm')}
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
