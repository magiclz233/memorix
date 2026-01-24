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
        'h-8 w-8',
        className
      )}
    />
  );
}
