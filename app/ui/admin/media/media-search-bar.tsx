'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type MediaSearchBarProps = {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onClear: () => void;
  clearAriaLabel?: string;
};

export function MediaSearchBar({
  value,
  placeholder,
  onChange,
  onClear,
  clearAriaLabel,
}: MediaSearchBarProps) {
  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-full border-zinc-200 bg-white/80 pl-9 pr-10 dark:border-zinc-800 dark:bg-zinc-900/80"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          'absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full',
          value ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClear}
        aria-label={clearAriaLabel || 'clear'}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}