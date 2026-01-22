'use client';

import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useLocale,
  useMessages,
  useTranslations,
  type TranslationValues,
} from 'next-intl';
import { createPortal } from 'react-dom';
import { BlurImage } from '@/app/ui/gallery/blur-image';
import type { GalleryItem as BaseGalleryItem } from '@/app/lib/gallery';
import { resolveMessage } from '@/app/lib/i18n';
import { cn } from '@/lib/utils';
import { GalleryHeader } from '@/app/ui/front/gallery-header';

type GalleryId = string | number;

type GalleryItem = BaseGalleryItem & {
  resolution?: string | null;
};

type Gallery25Props = {
  items?: GalleryItem[];
  className?: string;
};

type ViewMode = 'fit' | 'crop';

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

const readStoredViewMode = (key: string, fallback: ViewMode) => {
  if (typeof window === 'undefined') return fallback;
  const stored = window.sessionStorage.getItem(key);
  if (stored === 'fit' || stored === 'crop') return stored;
  return fallback;
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

const formatNumber = (value?: number | null, digits = 1) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return value.toFixed(digits).replace(/\.0+$/, '');
};

const formatExposure = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  if (value >= 1) return `${formatNumber(value, 2)}s`;
  const denominator = Math.round(1 / value);
  return `1/${denominator}s`;
};

const formatFileSize = (bytes?: number | null) => {
  if (typeof bytes !== 'number' || Number.isNaN(bytes)) return null;
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${formatNumber(size, index === 0 ? 0 : 1)}${units[index]}`;
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

const formatDate = (value: string | null | undefined, locale: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString(locale, { hour12: false });
};

const formatCoordinate = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return formatNumber(value, 6);
};

const resolveTimelineTimestamp = (item: GalleryItem) => {
  const value = item.dateShot ?? item.createdAt;
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) return 0;
  return parsed;
};

const resolveItemType = (item: GalleryItem) => item.type ?? 'photo';

const buildDetails = (
  item: GalleryItem,
  t: TranslationFn,
  locale: string,
) => {
  const cameraLabel =
    item.maker && item.camera ? `${item.maker} ${item.camera}` : item.camera ?? item.maker;
  const resolution =
    item.resolution ?? (item.width && item.height ? `${item.width}×${item.height}` : null);
  const latitude = formatCoordinate(item.gpsLatitude);
  const longitude = formatCoordinate(item.gpsLongitude);
  const coordinate =
    latitude && longitude ? `${latitude}, ${longitude}` : latitude ?? longitude ?? null;

  const details = [
    { label: t('details.resolution'), value: resolution },
    { label: t('details.camera'), value: cameraLabel },
    { label: t('details.lens'), value: item.lens },
    {
      label: t('details.aperture'),
      value: item.aperture ? `f/${formatNumber(item.aperture, 1)}` : null,
    },
    { label: t('details.shutter'), value: formatExposure(item.exposure) },
    { label: t('details.iso'), value: item.iso ? `ISO ${item.iso}` : null },
    {
      label: t('details.focalLength'),
      value: item.focalLength ? `${formatNumber(item.focalLength, 1)}mm` : null,
    },
    { label: t('details.whiteBalance'), value: item.whiteBalance },
    { label: t('details.coordinates'), value: coordinate },
    { label: t('details.dateShot'), value: formatDate(item.dateShot, locale) },
    { label: t('details.fileSize'), value: formatFileSize(item.size) },
  ];

  return details.filter((detail) => detail.value);
};

const Gallery25 = ({ items = [], className }: Gallery25Props) => {
  const locale = useLocale();
  const t = useTranslations('front.galleryGrid');
  const messages = useMessages();
  const [selectedId, setSelectedId] = useState<GalleryId | null>(null);
  const [isFullBleed, setIsFullBleed] = useState(false);
  const [columnCount, setColumnCount] = useState(() =>
    readStoredNumber('gallery25-columns', 4),
  );
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    readStoredViewMode('gallery25-view-mode', 'fit'),
  );
  const [filter, setFilter] = useState<FilterValue>('all');
  const [isChromeVisible, setIsChromeVisible] = useState(true);
  const [ratioMap, setRatioMap] = useState<Record<string, number>>({});
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
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
  const selectedTitle = selected
    ? resolveMessage(messages, selected.title)
    : '';
  const selectedDescription = selected
    ? resolveMessage(messages, selected.description)
    : '';
  const selectedDetails = useMemo(
    () => (selected ? buildDetails(selected, t, locale) : []),
    [locale, selected, t],
  );
  const selectedAspectRatio = selected
    ? getAspectRatioValue(selected, ratioMap)
    : 1;
  const modalDimensions = useMemo(() => {
    if (!selected || viewMode !== 'crop') return null;
    if (!viewport.width || !viewport.height) return null;
    const maxWidth = Math.min(viewport.width * 0.96, 1400);
    const maxHeight = Math.min(viewport.height * 0.88, 900);
    if (viewport.width < 768) {
      return {
        width: Math.round(maxWidth),
        height: Math.round(maxHeight),
      };
    }
    const padding = 64;
    const gap = 24;
    const detailsWidth = 320;
    const ratio = selectedAspectRatio > 0 ? selectedAspectRatio : 1;
    const availableWidth = Math.max(0, maxWidth - detailsWidth - gap - padding);
    const availableHeight = Math.max(0, maxHeight - padding);
    let imageWidth = availableHeight * ratio;
    let imageHeight = availableHeight;
    if (imageWidth > availableWidth) {
      imageWidth = availableWidth;
      imageHeight = imageWidth / ratio;
    }
    const modalWidth = Math.min(
      maxWidth,
      Math.max(720, imageWidth + detailsWidth + gap + padding),
    );
    const modalHeight = Math.min(
      maxHeight,
      Math.max(520, imageHeight + padding),
    );
    return {
      width: Math.round(modalWidth),
      height: Math.round(modalHeight),
    };
  }, [selected, selectedAspectRatio, viewMode, viewport.height, viewport.width]);

  const chromeVisible = !isFullBleed || isChromeVisible;

  useEffect(() => {
    window.localStorage.setItem('gallery25-columns', String(columnCount));
  }, [columnCount]);

  useEffect(() => {
    window.sessionStorage.setItem('gallery25-view-mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

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
  }, [selected, selectedIndex, visibleItems]);

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

  const modalNode = (
    <AnimatePresence>
      {selected ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className='fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 py-6'
        >
          <button
            type='button'
            onClick={() => setSelectedId(null)}
            className='absolute inset-0'
            aria-label={t('modal.closeAria')}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.2 }}
            role='dialog'
            aria-modal='true'
            className={cn(
              'relative z-10 flex w-[96vw] flex-col rounded-3xl border border-border bg-card p-6 text-foreground shadow-2xl md:p-8',
              viewMode === 'crop'
                ? 'h-[85vh] transition-[width,height] duration-300 ease-out md:h-[88vh]'
                : 'h-[85vh] max-w-7xl md:h-[88vh]',
            )}
            style={
              viewMode === 'crop' && modalDimensions
                ? {
                    width: modalDimensions.width,
                    height: modalDimensions.height,
                  }
                : undefined
            }
          >
            <div className='flex flex-wrap items-center justify-between gap-3 pb-4'>
              <div className='inline-flex rounded-full border border-border bg-muted/60 p-1 text-xs text-muted-foreground'>
                <button
                  type='button'
                  onClick={() => setViewMode('fit')}
                  className={cn(
                    'rounded-full px-3 py-1 transition',
                    viewMode === 'fit'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'hover:text-foreground',
                  )}
                >
                  {t('modal.viewFit')}
                </button>
                <button
                  type='button'
                  onClick={() => setViewMode('crop')}
                  className={cn(
                    'rounded-full px-3 py-1 transition',
                    viewMode === 'crop'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'hover:text-foreground',
                  )}
                >
                  {t('modal.viewCrop')}
                </button>
              </div>
              <button
                type='button'
                onClick={() => setSelectedId(null)}
                className='rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:text-foreground'
              >
                {t('modal.close')}
              </button>
            </div>
            <div className='grid min-h-0 flex-1 gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]'>
              <div className='relative flex min-h-0 flex-col rounded-2xl bg-muted/60 p-3'>
                <div
                  className='relative h-full w-full overflow-hidden rounded-xl bg-muted'
                  style={{ aspectRatio: getAspectRatioValue(selected, ratioMap) }}
                >
                  <BlurImage
                    fill
                    sizes='(max-width: 768px) 90vw, 60vw'
                    src={selected.src}
                    alt={selectedTitle}
                    blurHash={selected.blurHash}
                    className={cn(
                      viewMode === 'crop' ? 'object-cover' : 'object-contain',
                    )}
                    onLoadingComplete={(image) => {
                      const ratioKey = getRatioKey(selected.id);
                      if (ratioMap[ratioKey]) return;
                      if (!image.naturalWidth || !image.naturalHeight) return;
                      const ratio = image.naturalWidth / image.naturalHeight;
                      setRatioMap((prev) => ({
                        ...prev,
                        [ratioKey]: ratio,
                      }));
                    }}
                  />
                </div>
                {canNavigate ? (
                  <>
                    <button
                      type='button'
                      onClick={() => handleNavigate('prev')}
                      className='absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-black/40 p-2 text-white backdrop-blur transition hover:bg-black/60'
                      aria-label={t('modal.previous')}
                    >
                      <ChevronLeft className='h-5 w-5' />
                    </button>
                    <button
                      type='button'
                      onClick={() => handleNavigate('next')}
                      className='absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-black/40 p-2 text-white backdrop-blur transition hover:bg-black/60'
                      aria-label={t('modal.next')}
                    >
                      <ChevronRight className='h-5 w-5' />
                    </button>
                  </>
                ) : null}
              </div>
              <div className='max-h-full space-y-4 overflow-y-auto text-sm text-muted-foreground'>
                <div>
                  <p className='text-base font-semibold text-foreground'>{selectedTitle}</p>
                  {selectedDescription ? (
                    <p className='mt-2 text-sm text-muted-foreground'>
                      {selectedDescription}
                    </p>
                  ) : null}
                </div>
                <div className='space-y-2'>
                  {selectedDetails.length > 0 ? (
                    selectedDetails.map((detail) => (
                      <div
                        key={detail.label}
                        className='flex items-start justify-between gap-4 border-b border-border pb-2 last:border-b-0 last:pb-0'
                      >
                        <span className='text-xs text-muted-foreground'>{detail.label}</span>
                        <span className='text-right text-sm text-foreground'>{detail.value}</span>
                      </div>
                    ))
                  ) : (
                    <p className='text-sm text-muted-foreground'>
                      {t('details.empty')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

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
            <GalleryHeader />
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
        <div ref={gridRef} className='flex gap-4'>
          {columns.map((columnItems, columnIndex) => {
            const yOffset = columnIndex % 2 === 0 ? 40 : -40;

            return (
              <div key={columnIndex} className='flex min-w-0 flex-1 flex-col gap-4'>
                {columnItems.map((item, itemIndex) => {
                  const itemTitle = resolveMessage(messages, item.title);
                  return (
                    <motion.article
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.96, y: yOffset }}
                      whileInView={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: itemIndex * 0.08 }}
                      className='group relative w-full overflow-hidden rounded-2xl border border-border bg-card'
                    >
                      <button
                        type='button'
                        onClick={() => setSelectedId(item.id)}
                        className='block w-full text-left'
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
                          <div className='absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100' />
                          <div className='absolute inset-x-0 bottom-0 px-4 pb-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100'>
                            <p className='truncate text-sm font-medium text-white'>
                              {itemTitle}
                            </p>
                            {item.resolution || (item.width && item.height) ? (
                              <p className='text-xs text-white/60'>
                                {item.resolution ?? `${item.width}?${item.height}`}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    </motion.article>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {typeof document !== 'undefined' ? createPortal(modalNode, document.body) : null}
    </section>
  );
};

export { Gallery25 };
