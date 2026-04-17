'use client';

import { useMemo } from 'react';
import { VirtualScroller } from '@/app/ui/components/virtual-scroller';
import { OptimizedImage } from '@/app/ui/components/optimized-image';

interface GalleryMediaItem {
  id: number;
  url: string;
  thumbUrl: string | null;
  blurHash: string | null;
  mediaType: string;
  title: string | null;
  resolutionWidth?: number | null;
  resolutionHeight?: number | null;
}

interface VirtualGalleryGridProps {
  items: GalleryMediaItem[];
  /** 每行列数，默认 3 */
  columns?: number;
  /** 每项高度（像素），默认 300 */
  itemHeight?: number;
  /** 点击媒体项回调 */
  onItemClick?: (item: GalleryMediaItem) => void;
}

/**
 * 画廊虚拟滚动网格
 * 将媒体列表按行分组，使用虚拟滚动仅渲染可见行
 */
export function VirtualGalleryGrid({
  items,
  columns = 3,
  itemHeight = 300,
  onItemClick,
}: VirtualGalleryGridProps) {
  // 将一维数组转换为行数组
  const rows = useMemo(() => {
    const result: GalleryMediaItem[][] = [];
    for (let i = 0; i < items.length; i += columns) {
      result.push(items.slice(i, i + columns));
    }
    return result;
  }, [items, columns]);

  const estimateSize = () => itemHeight + 8; // 高度 + 间距

  return (
    <VirtualScroller
      items={rows}
      estimateSize={estimateSize}
      overscan={2}
      className="w-full"
      renderItem={(row) => (
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {row.map((item) => (
            <div
              key={item.id}
              className="cursor-pointer overflow-hidden rounded-lg"
              style={{ height: itemHeight }}
              onClick={() => onItemClick?.(item)}
            >
              <OptimizedImage
                src={item.thumbUrl || item.url}
                alt={item.title || `媒体 ${item.id}`}
                blurHash={item.blurHash}
                width={400}
                height={itemHeight}
                fill
                objectFit="cover"
                sizes={`(max-width: 768px) 100vw, ${Math.floor(100 / columns)}vw`}
                className="h-full w-full"
              />
            </div>
          ))}
          {/* 填充空白格子 */}
          {row.length < columns &&
            Array.from({ length: columns - row.length }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
        </div>
      )}
    />
  );
}
