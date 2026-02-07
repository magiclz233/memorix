'use client';

import { motion } from 'motion/react';
import { Play, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useLocale,
  useMessages,
  useTranslations,
  type TranslationValues,
} from 'next-intl';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BlurImage } from '@/app/ui/gallery/blur-image';
import type { GalleryItem as BaseGalleryItem } from '@/app/lib/gallery';
import { resolveMessage } from '@/app/lib/i18n';
import { cn } from '@/lib/utils';
import { GalleryHeader } from '@/app/ui/front/gallery-header';
import { PhotoDetailModal } from '@/app/ui/front/photo-detail-modal';

type GalleryId = string | number;

type GalleryItem = BaseGalleryItem & {
  resolution?: string | null;
  isPublished?: boolean;
};

type Gallery25Props = {
  items?: GalleryItem[];
  className?: string;
  showChrome?: boolean;
  showGrid?: boolean;
  showHeader?: boolean;
  selectedId?: GalleryId | null;
  onSelectedIdChange?: (id: GalleryId | null) => void;
  statusLabels?: { published: string; unpublished: string };
};

type TranslationFn = (key: string, values?: TranslationValues) => string;

const filters = [
  { value: 'all', key: 'all' },
  { value: 'photo', key: 'photo' },
  { value: 'video', key: 'video' },
  { value: 'timeline', key: 'timeline' },
] as const;

type FilterValue = (typeof filters)[number]['value'];

const clampColumnCount = (value: number) => Math.min(10, Math.max(3, value));

const readStoredNumber = (key: string, fallback: number) => {
  if (typeof window === 'undefined') return fallback;
  const stored = window.localStorage.getItem(key);
  if (!stored) return fallback;
  const parsed = Number(stored);
  if (Number.isNaN(parsed)) return fallback;
  return clampColumnCount(parsed);
};

const createBalancedColumns = (
  items: GalleryItem[],
  columnCount: number,
  ratioMap: Record<string, number>,
) => {
  const columns = Array.from({ length: columnCount }, () => [] as GalleryItem[]);
  const columnHeights = Array.from({ length: columnCount }, () => 0);

  items.forEach((item) => {
    const ratio = getAspectRatioValue(item, ratioMap);
    const safeRatio = ratio > 0 ? ratio : 1;
    const estimatedHeight = 1 / safeRatio;
    const shortestIndex = columnHeights.indexOf(Math.min(...columnHeights));
    columns[shortestIndex].push(item);
    columnHeights[shortestIndex] += estimatedHeight;
  });
  return columns;
};

const getRatioKey = (id: GalleryId) => String(id);

const getAspectRatioValue = (
  item: GalleryItem,
  ratioMap: Record<string, number>,
) => {
  const ratioKey = getRatioKey(item.id);
  if (ratioMap[ratioKey]) return ratioMap[ratioKey];
  if (item.width && item.height) {
    return item.width / item.height;
  }
  return 4 / 3;
};

const resolveTimelineTimestamp = (item: GalleryItem) => {
  const value = item.dateShot ?? item.createdAt;
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) return 0;
  return parsed;
};

const resolveItemType = (item: GalleryItem) => item.type ?? 'photo';

const Gallery25 = ({
  items = [],
  className,
  showChrome = true,
  showGrid = true,
  showHeader = true,
  selectedId: controlledSelectedId,
  onSelectedIdChange,
  statusLabels,
}: Gallery25Props) => {
  const locale = useLocale();
  const t = useTranslations('front.galleryGrid');
  const tMedia = useTranslations('front.media');
  const messages = useMessages();
  const [uncontrolledSelectedId, setUncontrolledSelectedId] =
    useState<GalleryId | null>(null);
  const [isFullBleed, setIsFullBleed] = useState(false);
  const [columnCount, setColumnCount] = useState(() =>
    readStoredNumber('gallery25-columns', 4),
  );
  const [filter, setFilter] = useState<FilterValue>('all');
  const [isChromeVisible, setIsChromeVisible] = useState(true);
  const [ratioMap, setRatioMap] = useState<Record<string, number>>({});
  const [hoveredId, setHoveredId] = useState<GalleryId | null>(null);

  const selectedId =
    controlledSelectedId === undefined
      ? uncontrolledSelectedId
      : controlledSelectedId;
  const setSelectedId = useCallback((id: GalleryId | null) => {
    if (controlledSelectedId === undefined) {
      setUncontrolledSelectedId(id);
    }
    onSelectedIdChange?.(id);
  }, [controlledSelectedId, onSelectedIdChange]);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const previousFullBleed = useRef(isFullBleed);
  const lastScrollY = useRef(0);
  const timelineItems = useMemo(() => {
    return items
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const timeA = resolveTimelineTimestamp(a.item);
        const timeB = resolveTimelineTimestamp(b.item);
        if (timeA === timeB) return a.index - b.index;
        return timeB - timeA;
      })
      .map((entry) => entry.item);
  }, [items]);
  const visibleItems = useMemo(() => {
    if (filter === 'timeline') return timelineItems;
    if (filter === 'all') return items;
    return items.filter((item) => resolveItemType(item) === filter);
  }, [filter, items, timelineItems]);
  const displayColumnCount = Math.min(
    columnCount,
    Math.max(1, visibleItems.length),
  );
  const gridSizes = `(max-width: 768px) 50vw, ${Math.round(
    (isFullBleed ? 100 : 88) / displayColumnCount,
  )}vw`;
  const columns = useMemo(
    () => createBalancedColumns(visibleItems, displayColumnCount, ratioMap),
    [displayColumnCount, ratioMap, visibleItems],
  );
  const selectedIndex = useMemo(() => {
    if (!selectedId) return -1;
    return visibleItems.findIndex((item) => item.id === selectedId);
  }, [selectedId, visibleItems]);
  const selected = useMemo(() => {
    if (!selectedId) return null;
    return visibleItems.find((item) => item.id === selectedId) ?? null;
  }, [selectedId, visibleItems]);

  const chromeVisible = showChrome && (!isFullBleed || isChromeVisible);

  useEffect(() => {
    window.localStorage.setItem('gallery25-columns', String(columnCount));
  }, [columnCount]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isFullBleed) return;
    let frame = 0;
    lastScrollY.current = window.scrollY;
    const onScroll = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const current = window.scrollY;
        const delta = current - lastScrollY.current;
        if (delta > 6) {
          setIsChromeVisible(false);
        }
        if (delta < -6) {
          setIsChromeVisible(true);
        }
        lastScrollY.current = current;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [isFullBleed]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isFullBleed) return;
    const onWheel = (event: WheelEvent) => {
      if (window.scrollY > 0) return;
      if (event.deltaY >= 0) return;
      setIsChromeVisible(true);
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
    };
  }, [isFullBleed]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const shouldHide = isFullBleed && !isChromeVisible;
    document.body.classList.toggle('gallery-chrome-hidden', shouldHide);
    return () => {
      document.body.classList.remove('gallery-chrome-hidden');
    };
  }, [isFullBleed, isChromeVisible]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let timeout: number | undefined;
    if (isFullBleed && !previousFullBleed.current) {
      const node = gridRef.current;
      if (node) {
        timeout = window.setTimeout(() => {
          node.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      }
    }
    previousFullBleed.current = isFullBleed;
    return () => {
      if (timeout) {
        window.clearTimeout(timeout);
      }
    };
  }, [isFullBleed]);

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedId(null);
        return;
      }
      if (visibleItems.length < 2) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const prevIndex =
          selectedIndex <= 0 ? visibleItems.length - 1 : selectedIndex - 1;
        setSelectedId(visibleItems[prevIndex]?.id ?? null);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const nextIndex =
          selectedIndex >= visibleItems.length - 1 ? 0 : selectedIndex + 1;
        setSelectedId(visibleItems[nextIndex]?.id ?? null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected, selectedIndex, setSelectedId, visibleItems]);

  useEffect(() => {
    if (selected) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('gallery-modal-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('gallery-modal-open');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('gallery-modal-open');
    };
  }, [selected]);

  const canNavigate = visibleItems.length > 1 && selectedIndex !== -1;
  const handleNavigate = (direction: 'prev' | 'next') => {
    if (!canNavigate) return;
    const nextIndex =
      direction === 'prev'
        ? selectedIndex <= 0
          ? visibleItems.length - 1
          : selectedIndex - 1
        : selectedIndex >= visibleItems.length - 1
          ? 0
          : selectedIndex + 1;
    setSelectedId(visibleItems[nextIndex]?.id ?? null);
  };

  if (!showGrid) {
    return (
      <PhotoDetailModal
        selectedItem={selected}
        items={visibleItems}
        onSelect={(id) => setSelectedId(id)}
        onClose={() => setSelectedId(null)}
        onPrev={() => handleNavigate('prev')}
        onNext={() => handleNavigate('next')}
        hasPrev={canNavigate}
        hasNext={canNavigate}
        locale={locale}
      />
    );
  }

  return (
    <section
      className={cn(
        'pb-24',
        isFullBleed && 'relative left-1/2 right-1/2 w-screen -translate-x-1/2',
        className,
      )}
    >
      <div
        className={cn(
          'relative space-y-8',
          isFullBleed ? 'w-full px-4 md:px-6' : 'w-full',
        )}
      >
        {chromeVisible ? (
          <>
            {showHeader ? <GalleryHeader /> : null}
            <div className='flex flex-wrap items-center justify-between gap-4'>
              <div className='flex flex-wrap gap-2 rounded-full border border-zinc-200 bg-white px-2 py-2 text-sm shadow-sm backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900'>
                {filters.map((tab) => (
                  <button
                    key={tab.value}
                    type='button'
                    onClick={() => setFilter(tab.value)}
                    className={cn(
                      'rounded-full px-4 py-2 text-xs uppercase tracking-[0.3em] transition',
                      filter === tab.value
                        ? 'bg-zinc-100 text-zinc-900 dark:bg-white/10 dark:text-white'
                        : 'text-zinc-600/80 hover:text-zinc-900 dark:text-white/60 dark:hover:text-white',
                    )}
                  >
                    {t(`filters.${tab.key}`)}
                  </button>
                ))}
              </div>
              <div className='flex flex-wrap items-center justify-end gap-3 text-sm text-muted-foreground'>
                <span>
                  {t('summary', {
                    visible: visibleItems.length,
                    total: items.length,
                  })}
                </span>
                <label className='flex items-center gap-2 text-xs text-muted-foreground'>
                  <span>{t('columns.label')}</span>
                  <input
                    type='range'
                    min={3}
                    max={10}
                    step={1}
                    value={columnCount}
                    onChange={(event) =>
                      setColumnCount(clampColumnCount(Number(event.target.value)))
                    }
                    className='h-1 w-32 cursor-pointer accent-primary'
                    aria-label={t('columns.aria')}
                  />
                  <span>{t('columns.count', { count: columnCount })}</span>
                </label>
                <button
                  type='button'
                  onClick={() => {
                    const next = !isFullBleed;
                    setIsFullBleed(next);
                    if (next) {
                      setIsChromeVisible(false);
                      return;
                    }
                    setIsChromeVisible(true);
                  }}
                  className='rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:text-foreground'
                >
                  {isFullBleed ? t('fullBleed.off') : t('fullBleed.on')}
                </button>
              </div>
            </div>
          </>
        ) : null}
        <div
          ref={gridRef}
          className={cn(
            'flex gap-4',
            isFullBleed && 'pt-4 md:pt-6',
          )}
        >
          {columns.map((columnItems, columnIndex) => {
            const yOffset = columnIndex % 2 === 0 ? 40 : -40;

            return (
              <div key={columnIndex} className='flex min-w-0 flex-1 flex-col gap-4'>
                {columnItems.map((item, itemIndex) => {
                  const itemTitle = resolveMessage(messages, item.title);
                  const isVideo = item.type === 'video';
                  const isLive = item.liveType && item.liveType !== 'none';
                  const isAnimated = Boolean(item.isAnimated && item.animatedUrl);
                  const isPlaying = hoveredId === item.id;
                  const canPreview = isVideo || isAnimated;
                  const previewVideoSrc = item.videoUrl ?? `/api/media/stream/${item.id}`;
                  const liveBadgeLabel =
                    item.liveType === 'embedded'
                      ? tMedia('motionBadge')
                      : tMedia('liveBadge');
                  const livePreviewLabel =
                    item.liveType === 'embedded'
                      ? tMedia('motionPhoto')
                      : tMedia('livePhoto');

                  return (
                    <motion.article
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.96, y: yOffset }}
                      whileInView={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: itemIndex * 0.08 }}
                      className='group relative w-full overflow-hidden rounded-2xl border border-border bg-card'
                      onMouseEnter={() => canPreview && setHoveredId(item.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <div
                        role='button'
                        tabIndex={0}
                        onClick={() => setSelectedId(item.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedId(item.id);
                          }
                        }}
                        className='block w-full text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
                      >
                        <div
                          className='relative w-full'
                          style={{ aspectRatio: getAspectRatioValue(item, ratioMap) }}
                        >
                          <BlurImage
                            fill
                            sizes={gridSizes}
                            className='object-cover transition duration-300 group-hover:scale-105'
                            src={item.src}
                            alt={itemTitle}
                            blurHash={item.blurHash}
                            onLoadingComplete={(image) => {
                              const ratioKey = getRatioKey(item.id);
                              if (ratioMap[ratioKey]) return;
                              if (!image.naturalWidth || !image.naturalHeight) return;
                              const ratio = image.naturalWidth / image.naturalHeight;
                              setRatioMap((prev) => ({
                                ...prev,
                                [ratioKey]: ratio,
                              }));
                            }}
                          />
                          {(isVideo || isLive) && isPlaying ? (
                            <video
                              src={previewVideoSrc}
                              poster={item.src}
                              autoPlay
                              muted
                              loop={isVideo}
                              playsInline
                              className='absolute inset-0 h-full w-full object-cover animate-in fade-in duration-300'
                              onEnded={isLive ? () => setHoveredId(null) : undefined}
                            />
                          ) : isAnimated && isPlaying ? (
                            <Image
                              src={item.animatedUrl ?? ''}
                              alt={itemTitle}
                              fill
                              sizes={gridSizes}
                              unoptimized
                              className='absolute inset-0 object-cover animate-in fade-in duration-300'
                            />
                          ) : null}
                          <div className='absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100' />
                          {isVideo ? (
                            <div className='absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md'>
                              <Play className='h-3 w-3 fill-white' />
                            </div>
                          ) : isLive ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type='button'
                                    onMouseEnter={() => setHoveredId(item.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                    onFocus={() => setHoveredId(item.id)}
                                    onBlur={() => setHoveredId(null)}
                                    onClick={(event) => event.stopPropagation()}
                                    aria-label={livePreviewLabel}
                                    className='absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60'
                                  >
                                    <Sparkles className='h-3.5 w-3.5' />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side='left'>
                                  {liveBadgeLabel}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : isAnimated ? (
                            <div className='absolute right-2 top-2 z-10 flex h-5 items-center justify-center rounded-full bg-black/50 px-1.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-md'>
                              {t('badges.animated')}
                            </div>
                          ) : null}
                          <div className='absolute inset-x-0 bottom-0 px-4 pb-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100'>
                            <p className='truncate text-sm font-medium text-white'>
                              {itemTitle}
                            </p>
                            {item.resolution || (item.width && item.height) ? (
                              <p className='text-xs text-white/60'>
                                {item.resolution ?? `${item.width}×${item.height}`}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <PhotoDetailModal
        selectedItem={selected}
        items={visibleItems}
        onSelect={(id) => setSelectedId(id)}
        onClose={() => setSelectedId(null)}
        onPrev={() => handleNavigate('prev')}
        onNext={() => handleNavigate('next')}
        hasPrev={canNavigate}
        hasNext={canNavigate}
        locale={locale}
      />
    </section>
  );
};

export { Gallery25 };
