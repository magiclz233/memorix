'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { cn } from '@/app/lib/utils';

interface VirtualScrollerProps<T> {
  /** 数据列表 */
  items: T[];
  /** 估算每项高度（像素） */
  estimateSize: (index: number) => number;
  /** 渲染每项内容 */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** 预渲染数量（可见区域外） */
  overscan?: number;
  className?: string;
}

/**
 * 虚拟滚动组件
 * 仅渲染可见区域的列表项，大幅提升长列表性能
 */
export function VirtualScroller<T>({
  items,
  estimateSize,
  renderItem,
  overscan = 5,
  className,
}: VirtualScrollerProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan,
  });

  return (
    <div
      ref={parentRef}
      className={cn('h-full overflow-auto', className)}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
