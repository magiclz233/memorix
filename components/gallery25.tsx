'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type GalleryItem = {
  id: number;
  src: string;
  title: string;
  resolution?: string | null;
  width?: number | null;
  height?: number | null;
  description?: string | null;
  camera?: string | null;
  maker?: string | null;
  lens?: string | null;
  dateShot?: string | null;
  exposure?: number | null;
  aperture?: number | null;
  iso?: number | null;
  focalLength?: number | null;
  whiteBalance?: string | null;
  size?: number | null;
};

type Gallery25Props = {
  items?: GalleryItem[];
  className?: string;
};

const clampColumnCount = (value: number) => Math.min(10, Math.max(3, value));

const readStoredBoolean = (key: string, fallback: boolean) => {
  if (typeof window === 'undefined') return fallback;
  const stored = window.localStorage.getItem(key);
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  return fallback;
};

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
  ratioMap: Record<number, number>,
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

const getAspectRatioValue = (
  item: GalleryItem,
  ratioMap: Record<number, number>,
) => {
  if (ratioMap[item.id]) return ratioMap[item.id];
  if (item.width && item.height) {
    return item.width / item.height;
  }
  return 4 / 3;
};

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString('zh-CN', { hour12: false });
};

const buildDetails = (item: GalleryItem) => {
  const cameraLabel =
    item.maker && item.camera ? `${item.maker} ${item.camera}` : item.camera ?? item.maker;
  const resolution =
    item.resolution ?? (item.width && item.height ? `${item.width}×${item.height}` : null);

  const details = [
    { label: '分辨率', value: resolution },
    { label: '相机', value: cameraLabel },
    { label: '镜头', value: item.lens },
    { label: '光圈', value: item.aperture ? `f/${formatNumber(item.aperture, 1)}` : null },
    { label: '快门', value: formatExposure(item.exposure) },
    { label: 'ISO', value: item.iso ? `ISO ${item.iso}` : null },
    { label: '焦距', value: item.focalLength ? `${formatNumber(item.focalLength, 1)}mm` : null },
    { label: '白平衡', value: item.whiteBalance },
    { label: '拍摄时间', value: formatDate(item.dateShot) },
    { label: '文件大小', value: formatFileSize(item.size) },
  ];

  return details.filter((detail) => detail.value);
};

const Gallery25 = ({ items = [], className }: Gallery25Props) => {
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const [isFullBleed, setIsFullBleed] = useState(() =>
    readStoredBoolean('gallery25-full-bleed', false),
  );
  const [columnCount, setColumnCount] = useState(() =>
    readStoredNumber('gallery25-columns', 4),
  );
  const [ratioMap, setRatioMap] = useState<Record<number, number>>({});
  const displayColumnCount = Math.min(columnCount, Math.max(1, items.length));
  const gridSizes = `(max-width: 768px) 50vw, ${Math.round(
    (isFullBleed ? 100 : 80) / displayColumnCount,
  )}vw`;
  const columns = useMemo(
    () => createBalancedColumns(items, displayColumnCount, ratioMap),
    [items, displayColumnCount, ratioMap],
  );
  const selectedDetails = useMemo(
    () => (selected ? buildDetails(selected) : []),
    [selected],
  );

  useEffect(() => {
    window.localStorage.setItem('gallery25-full-bleed', String(isFullBleed));
  }, [isFullBleed]);

  useEffect(() => {
    window.localStorage.setItem('gallery25-columns', String(columnCount));
  }, [columnCount]);

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelected(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected]);

  return (
    <section className={cn('py-32', className)}>
      <div
        className={cn(
          'relative space-y-4',
          isFullBleed ? 'w-full' : 'mx-auto max-w-6xl',
        )}
      >
        <div className='flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground'>
          <div className='flex flex-wrap items-center gap-4'>
            <span>共 {items.length} 张照片</span>
            <label className='flex items-center gap-2 text-xs text-muted-foreground'>
              <span>每行</span>
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
                aria-label='每行显示数量'
              />
              <span>{columnCount} 张</span>
            </label>
          </div>
          <button
            type='button'
            onClick={() => setIsFullBleed((prev) => !prev)}
            className='rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:text-foreground'
          >
            {isFullBleed ? '两边留白' : '铺满屏幕'}
          </button>
        </div>
        <div className='flex gap-4'>
          {columns.map((columnItems, columnIndex) => {
            const yOffset = columnIndex % 2 === 0 ? 40 : -40;

            return (
              <div key={columnIndex} className='flex min-w-0 flex-1 flex-col gap-4'>
                {columnItems.map((item, itemIndex) => (
                  <motion.article
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.96, y: yOffset }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: itemIndex * 0.08 }}
                    className='group relative w-full overflow-hidden rounded-2xl border border-border bg-card'
                  >
                    <button
                      type='button'
                      onClick={() => setSelected(item)}
                      className='block w-full text-left'
                    >
                      <div
                        className='relative w-full'
                        style={{ aspectRatio: getAspectRatioValue(item, ratioMap) }}
                      >
                        <Image
                          fill
                          sizes={gridSizes}
                          className='object-cover transition duration-300 group-hover:scale-105'
                          src={item.src}
                          alt={item.title}
                          onLoadingComplete={(image) => {
                            if (ratioMap[item.id]) return;
                            if (!image.naturalWidth || !image.naturalHeight) return;
                            const ratio = image.naturalWidth / image.naturalHeight;
                            setRatioMap((prev) => ({
                              ...prev,
                              [item.id]: ratio,
                            }));
                          }}
                        />
                        <div className='absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100' />
                        <div className='absolute inset-x-0 bottom-0 px-4 pb-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100'>
                          <p className='truncate text-sm font-medium text-white'>
                            {item.title}
                          </p>
                          {item.resolution || (item.width && item.height) ? (
                            <p className='text-xs text-white/70'>
                              {item.resolution ?? `${item.width}×${item.height}`}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  </motion.article>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selected ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-10'
          >
            <button
              type='button'
              onClick={() => setSelected(null)}
              className='absolute inset-0'
              aria-label='关闭'
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.2 }}
              role='dialog'
              aria-modal='true'
              className='relative z-10 w-full max-w-5xl rounded-2xl border border-border bg-card p-6 text-foreground shadow-2xl'
            >
              <button
                type='button'
                onClick={() => setSelected(null)}
                className='absolute right-4 top-4 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:text-foreground'
              >
                关闭
              </button>
              <div className='grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'>
                <div className='rounded-2xl bg-muted/60 p-3'>
                  <div
                    className='relative w-full overflow-hidden rounded-xl bg-muted'
                    style={{ aspectRatio: getAspectRatioValue(selected, ratioMap) }}
                  >
                    <Image
                      fill
                      sizes='(max-width: 768px) 90vw, 60vw'
                      src={selected.src}
                      alt={selected.title}
                      className='object-contain'
                      onLoadingComplete={(image) => {
                        if (ratioMap[selected.id]) return;
                        if (!image.naturalWidth || !image.naturalHeight) return;
                        const ratio = image.naturalWidth / image.naturalHeight;
                        setRatioMap((prev) => ({
                          ...prev,
                          [selected.id]: ratio,
                        }));
                      }}
                    />
                  </div>
                </div>
                <div className='space-y-4 text-sm text-muted-foreground'>
                  <div>
                    <p className='text-base font-semibold text-foreground'>{selected.title}</p>
                    {selected.description ? (
                      <p className='mt-2 text-sm text-muted-foreground'>{selected.description}</p>
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
                      <p className='text-sm text-muted-foreground'>暂无可用的详细信息。</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
};

export { Gallery25 };
