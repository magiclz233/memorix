'use client';

import { Filter } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-10 rounded-full px-4 text-zinc-600 dark:text-zinc-300">
          <Filter className="mr-2 h-4 w-4" />
          {t('filters.advanced')}
          {activeCount > 0 ? (
            <span className="ml-1.5 inline-flex h-5 items-center justify-center rounded-full bg-indigo-100 px-1.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">{t('filters.advanced')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2 pt-4">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-zinc-500">{t('filters.storageInstance')}</p>
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

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-zinc-500">{t('filters.status.label')}</p>
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

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-zinc-500">{t('filters.type.label')}</p>
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

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-zinc-500">{t('filters.from')}</p>
            <Input type="date" value={dateFrom} onChange={(event) => onDateFromChange(event.target.value)} />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-zinc-500">{t('filters.to')}</p>
            <Input type="date" value={dateTo} onChange={(event) => onDateToChange(event.target.value)} />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-zinc-500">{t('filters.hero.label')}</p>
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

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClear}>
            {t('filters.clearFilters') || t('filters.clear')}
          </Button>
          <Button 
            size="sm" 
            onClick={() => onOpenChange(false)} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            {t('filters.apply')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}