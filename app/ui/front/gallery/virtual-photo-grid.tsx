'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useLocale, useMessages, useTranslations } from 'next-intl';
import { Play, Sparkles } from 'lucide-react';
import type { GalleryItem } from '@/app/lib/gallery';
import {
  computeJustifiedRows,
  targetRowHeightForColumns,
} from '@/app/lib/justified-layout';
import { BlurImage } from '@/app/ui/gallery/blur-image';
import { resolveMessage } from '@/app/lib/i18n';
import { cn } from '@/lib/utils';

const PhotoDetailModal = dynamic(
  () => import('@/app/ui/front/photo-detail-modal').then((mod) => mod.PhotoDetailModal),
  { ssr: false },
);

type Props = {
  items: GalleryItem[];
  /** 桌面端目标列数，窄屏自动减半 */
  columns?: number;
  className?: string;
  /** 受控选中 id（?media= 深链） */
  selectedId?: string | null;
  onSelectedIdChange?: (id: string | null) => void;
};

const useIsNarrow = () => {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 640px)');
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return narrow;
};

/**
 * P1-3：真正窗口化的前置画廊。
 *
 * - 用 @tanstack/react-virtual 只渲染视口附近的「行」，万张图下 DOM 节点数恒定；
 * - 行内用 justified rows 布局（等高、两端对齐），保留照片的原始宽高比；
 * - 滚动使用 window 作为滚动容器，兼容前台整页滚动 + 无限加载 sentinel。
 *
 * 注意：不使用 VirtualScroller（它是内部 overflow 容器的方案），因为前台画廊
 * 依赖页面级滚动；这里用 useVirtualizer + 手动把 getScrollElement 指向 window。
 */
export function VirtualPhotoGrid({
  items,
  columns = 5,
  className,
  selectedId: controlledSelectedId,
  onSelectedIdChange,
}: Props) {
  const t = useTranslations('front.galleryGrid');
  const tMedia = useTranslations('front.media');
  const locale = useLocale();
  const messages = useMessages();
  const isNarrow = useIsNarrow();

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [scrollMargin, setScrollMargin] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [uncontrolledSelectedId, setUncontrolledSelectedId] = useState<string | null>(null);
  const selectedId = controlledSelectedId === undefined ? uncontrolledSelectedId : controlledSelectedId;
  const setSelectedId = useCallback(
    (id: string | null) => {
      if (controlledSelectedId === undefined) setUncontrolledSelectedId(id);
      onSelectedIdChange?.(id);
    },
    [controlledSelectedId, onSelectedIdChange],
  );

  // 监听容器宽度（ResizeObserver）
  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const update = () => setContainerWidth(node.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // window 虚拟滚动需要知道列表顶部距文档顶端的偏移（scrollMargin）
  useLayoutEffect(() => {
    const update = () => {
      const node = containerRef.current;
      if (!node) return;
      const top = node.getBoundingClientRect().top + window.scrollY;
      setScrollMargin(top);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const effectiveColumns = isNarrow ? 2 : columns;
  const targetHeight = useMemo(
    () => targetRowHeightForColumns(containerWidth || 1200, effectiveColumns),
    [containerWidth, effectiveColumns],
  );

  const rows = useMemo(
    () => computeJustifiedRows(items, containerWidth || 1200, targetHeight),
    [items, containerWidth, targetHeight],
  );

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: (index) => (rows[index]?.height ?? targetHeight) + 16,
    overscan: 4,
    scrollMargin,
  });

  const virtualRows = virtualizer.getVirtualItems();

  const selectedIndex = useMemo(
    () => items.findIndex((item) => item.id === selectedId),
    [items, selectedId],
  );
  const selected = selectedIndex >= 0 ? items[selectedIndex] : null;

  const navigate = useCallback(
    (direction: 'prev' | 'next') => {
      if (items.length < 2 || selectedIndex < 0) return;
      const next =
        direction === 'prev'
          ? (selectedIndex - 1 + items.length) % items.length
          : (selectedIndex + 1) % items.length;
      const target = items[next];
      setSelectedId(target?.id ?? null);
      // 灯箱切换后把虚拟列表滚到对应行
      if (target) {
        const rowIndex = rows.findIndex((row) =>
          row.items.some((entry) => entry.item.id === target.id),
        );
        if (rowIndex >= 0) virtualizer.scrollToIndex(rowIndex, { align: 'auto' });
      }
    },
    [items, rows, selectedIndex, setSelectedId, virtualizer],
  );

  // 灯箱打开时锁定页面滚动
  useEffect(() => {
    if (!selected) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [selected]);

  if (items.length === 0) return null;

  return (
    <section className={cn('relative w-full', className)}>
      <div ref={containerRef} className="relative w-full">
        <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index];
            if (!row) return null;
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                className="absolute left-0 top-0 flex w-full gap-4"
                style={{
                  height: row.height + 16,
                  // useWindowVirtualizer 的 start 已包含 scrollMargin，需减掉得到容器内偏移
                  transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                }}
              >
                {row.items.map((positioned) => {
                  const item = positioned.item;
                  const itemTitle = resolveMessage(messages, item.title);
                  const isVideo = item.type === 'video';
                  const isLive = item.liveType && item.liveType !== 'none';
                  const isAnimated = Boolean(item.isAnimated && item.animatedUrl);
                  const isPlaying = hoveredId === item.id;
                  const liveBadgeLabel =
                    item.liveType === 'embedded'
                      ? tMedia('motionBadge')
                      : tMedia('liveBadge');
                  return (
                    <div
                      key={item.id}
                      className="group relative shrink-0 overflow-hidden rounded-xl border border-border bg-card"
                      style={{ width: positioned.width, height: row.height }}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedId(item.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedId(item.id);
                          }
                        }}
                        onMouseEnter={() => (isVideo || isAnimated || isLive) && setHoveredId(item.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className="block h-full w-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        aria-label={itemTitle}
                      >
                        <div className="relative h-full w-full">
                          <BlurImage
                            fill
                            sizes={`${Math.round(positioned.width)}px`}
                            src={item.src}
                            alt={itemTitle}
                            blurHash={item.blurHash}
                            className="object-cover transition duration-300 group-hover:scale-105"
                          />
                          {isVideo && isPlaying ? (
                            <video
                              src={item.videoUrl ?? `/api/media/stream/${item.id}`}
                              poster={item.src}
                              autoPlay
                              muted
                              loop
                              playsInline
                              preload="none"
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                          ) : null}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                          {isVideo ? (
                            <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md">
                              <Play className="h-3 w-3 fill-white" />
                            </span>
                          ) : isLive ? (
                            <span
                              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md"
                              title={liveBadgeLabel}
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                            </span>
                          ) : null}
                          <div className="absolute inset-x-0 bottom-0 px-3 pb-2 opacity-0 transition-opacity group-hover:opacity-100">
                            <p className="truncate text-xs font-medium text-white">{itemTitle}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <PhotoDetailModal
        selectedItem={selected}
        items={items}
        onSelect={(id) => setSelectedId(id)}
        onClose={() => setSelectedId(null)}
        onPrev={() => navigate('prev')}
        onNext={() => navigate('next')}
        hasPrev={items.length > 1}
        hasNext={items.length > 1}
        locale={locale}
      />
    </section>
  );
}
