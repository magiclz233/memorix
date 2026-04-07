'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { FilterKey } from './use-media-filters';

type FilterChip = {
  key: FilterKey;
  label: string;
};

type FilterChipsProps = {
  chips: FilterChip[];
  onRemove: (key: FilterKey) => void;
  onClear: () => void;
};

export function FilterChips({ chips, onRemove, onClear }: FilterChipsProps) {
  const t = useTranslations('dashboard.media');

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/60">
      <span className="text-xs text-zinc-500">{t('filters.current')}</span>
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          variant="secondary"
          className="gap-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
        >
          {chip.label}
          <button
            type="button"
            onClick={() => onRemove(chip.key)}
            aria-label={t('filters.remove')}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={onClear}>
        {t('filters.clear')}
      </Button>
    </div>
  );
}