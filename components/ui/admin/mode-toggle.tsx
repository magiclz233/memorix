'use client';

import { ModeToggle as BaseModeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

type ModeToggleProps = {
  className?: string;
};

export function ModeToggle({ className }: ModeToggleProps) {
  return (
    <BaseModeToggle
      className={cn(
        'h-8 w-8 rounded-full border-zinc-200 bg-white/70 text-zinc-700 shadow-sm hover:bg-white dark:border-zinc-700 dark:bg-black/40 dark:text-zinc-100 dark:hover:bg-zinc-800',
        className
      )}
    />
  );
}
