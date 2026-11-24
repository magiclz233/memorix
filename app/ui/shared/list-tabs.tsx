'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export type ListTabItem = {
  value: string;
  label: ReactNode;
  icon?: LucideIcon;
  count?: number;
};

type ListTabsProps = {
  items: readonly ListTabItem[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  size?: 'sm' | 'md';
};

/**
 * 管理端通用页签：胶囊样式、支持图标/计数、移动端横向滚动。
 * 媒体库来源筛选、收藏类型/状态、上传任务状态共用这一实现。
 */
export function ListTabs({
  items,
  value,
  onChange,
  ariaLabel,
  className,
  size = 'md',
}: ListTabsProps) {
  return (
    <div
      role='tablist'
      aria-label={ariaLabel}
      className={cn(
        'scrollbar-hide flex items-center gap-2 overflow-x-auto pb-1',
        className,
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.value === value;

        return (
          <button
            key={item.value}
            type='button'
            role='tab'
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-full font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
              'dark:focus-visible:ring-offset-zinc-950',
              size === 'sm'
                ? 'px-3 py-1.5 text-xs'
                : 'px-4 py-2 text-sm',
              active
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800',
            )}
          >
            {Icon ? <Icon className='h-4 w-4' aria-hidden='true' /> : null}
            <span>{item.label}</span>
            {typeof item.count === 'number' ? (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 font-mono text-xs tabular-nums',
                  active
                    ? 'bg-white/20 text-white dark:bg-black/15 dark:text-zinc-900'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
