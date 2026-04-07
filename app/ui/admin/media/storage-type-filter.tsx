'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type CategoryItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  count?: number;
};

type StorageTypeFilterProps = {
  value: string;
  categories: CategoryItem[];
  onChange: (category: string) => void;
};

export function StorageTypeFilter({
  value,
  categories,
  onChange,
}: StorageTypeFilterProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {categories.map((category) => {
        const Icon = category.icon;
        const active = category.id === value;

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange(category.id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800',
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{category.label}</span>
            {typeof category.count === 'number' ? (
              <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-xs dark:bg-white/20">
                {category.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
