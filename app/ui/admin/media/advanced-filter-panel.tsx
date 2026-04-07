'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { HeroValue, MediaTypeValue, PublishedValue } from './use-media-filters';

type StorageOption = {
  id: number;
  label: string;
};

type AdvancedFilterPanelProps = {
  open: boolean;
  activeCount: number;
  storageOptions: StorageOption[];
  storageId: number | null;
  published: PublishedValue;
  mediaType: MediaTypeValue;
  dateFrom: string;
  dateTo: string;
  hero: HeroValue;
  onOpenChange: (open: boolean) => void;
  onStorageChange: (id: number | null) => void;
  onPublishedChange: (value: PublishedValue) => void;
  onMediaTypeChange: (value: MediaTypeValue) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onHeroChange: (value: HeroValue) => void;
  onClear: () => void;
};

export function AdvancedFilterPanel({
  open,
  activeCount,
  storageOptions,
  storageId,
  published,
  mediaType,
  dateFrom,
  dateTo,
  hero,
  onOpenChange,
  onStorageChange,
  onPublishedChange,
  onMediaTypeChange,
  onDateFromChange,
  onDateToChange,
  onHeroChange,
  onClear,
}: AdvancedFilterPanelProps) {
  const t = useTranslations('dashboard.media');

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="h-10 rounded-full px-4">
          {t('filters.advanced')}
          {activeCount > 0 ? ` (${activeCount})` : ''}
          <ChevronDown className={cn('ml-2 h-4 w-4 transition-transform', open && 'rotate-180')} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs text-zinc-500">{t('filters.storageInstance')}</p>
            <Select
              value={storageId === null ? 'all' : String(storageId)}
              onValueChange={(value) => onStorageChange(value === 'all' ? null : Number(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allInstances')}</SelectItem>
                {storageOptions.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-zinc-500">{t('filters.status.label')}</p>
            <Select value={published} onValueChange={(value) => onPublishedChange(value as PublishedValue)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.status.all')}</SelectItem>
                <SelectItem value="published">{t('filters.status.published')}</SelectItem>
                <SelectItem value="unpublished">{t('filters.status.unpublished')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-zinc-500">{t('filters.type.label')}</p>
            <Select value={mediaType} onValueChange={(value) => onMediaTypeChange(value as MediaTypeValue)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.type.all')}</SelectItem>
                <SelectItem value="image">{t('filters.type.image')}</SelectItem>
                <SelectItem value="video">{t('filters.type.video')}</SelectItem>
                <SelectItem value="animated">{t('filters.type.animated')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-zinc-500">{t('filters.from')}</p>
            <Input type="date" value={dateFrom} onChange={(event) => onDateFromChange(event.target.value)} />
          </div>

          <div className="space-y-1">
            <p className="text-xs text-zinc-500">{t('filters.to')}</p>
            <Input type="date" value={dateTo} onChange={(event) => onDateToChange(event.target.value)} />
          </div>

          <div className="space-y-1">
            <p className="text-xs text-zinc-500">{t('filters.hero.label')}</p>
            <Select value={hero} onValueChange={(value) => onHeroChange(value as HeroValue)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.hero.all')}</SelectItem>
                <SelectItem value="yes">{t('filters.hero.yes')}</SelectItem>
                <SelectItem value="no">{t('filters.hero.no')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClear}>
            {t('filters.clear')}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}