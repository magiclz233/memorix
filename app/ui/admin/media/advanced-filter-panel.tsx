'use client';

import { useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  HasGpsValue,
  HeroValue,
  MediaFilters,
  MediaTypeValue,
  OrientationValue,
  PublishedValue,
} from './use-media-filters';

type StorageOption = {
  id: number;
  label: string;
};

type AdvancedFilterDraft = Pick<
  MediaFilters,
  | 'storageId'
  | 'status'
  | 'type'
  | 'dateFrom'
  | 'dateTo'
  | 'hero'
  | 'orientation'
  | 'camera'
  | 'lens'
  | 'hasGps'
>;

type AdvancedFilterPanelProps = {
  open: boolean;
  activeCount: number;
  storageOptions: StorageOption[];
  filters: AdvancedFilterDraft;
  onOpenChange: (open: boolean) => void;
  onApply: (next: Partial<MediaFilters>) => void;
  onClear: () => void;
};

/**
 * 右侧抽屉式高级筛选（草稿态编辑，点击“应用”后一次提交 URL 变更，避免每次选择都反复刷新）。
 */
export function AdvancedFilterPanel({
  open,
  activeCount,
  storageOptions,
  filters,
  onOpenChange,
  onApply,
  onClear,
}: AdvancedFilterPanelProps) {
  const t = useTranslations('dashboard.media');
  const [draft, setDraft] = useState<AdvancedFilterDraft>(filters);

  useEffect(() => {
    if (open) {
      setDraft(filters);
    }
  }, [filters, open]);

  const handleApply = () => {
    onApply(draft);
    onOpenChange(false);
  };

  const handleClear = () => {
    onClear();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 rounded-full border-zinc-200 bg-white/80 px-3.5 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>{t('filters.advanced')}</span>
          {activeCount > 0 ? (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 font-mono text-[10px] font-semibold text-white">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t('filters.advanced')}</SheetTitle>
          <SheetDescription>{t('filters.advancedDesc')}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-4 pr-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">{t('filters.storageInstance')}</Label>
              <Select
                value={draft.storageId === null ? 'all' : String(draft.storageId)}
                onValueChange={(value) =>
                  setDraft((prev) => ({
                    ...prev,
                    storageId: value === 'all' ? null : Number(value),
                  }))
                }
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
              <Label className="text-xs text-zinc-500">{t('filters.status.label')}</Label>
              <Select
                value={draft.status}
                onValueChange={(value) =>
                  setDraft((prev) => ({ ...prev, status: value as PublishedValue }))
                }
              >
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
              <Label className="text-xs text-zinc-500">{t('filters.type.label')}</Label>
              <Select
                value={draft.type}
                onValueChange={(value) =>
                  setDraft((prev) => ({ ...prev, type: value as MediaTypeValue }))
                }
              >
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
              <Label className="text-xs text-zinc-500">{t('filters.hero.label')}</Label>
              <Select
                value={draft.hero}
                onValueChange={(value) =>
                  setDraft((prev) => ({ ...prev, hero: value as HeroValue }))
                }
              >
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

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">{t('filters.orientation.label')}</Label>
              <Select
                value={draft.orientation}
                onValueChange={(value) =>
                  setDraft((prev) => ({ ...prev, orientation: value as OrientationValue }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.orientation.all')}</SelectItem>
                  <SelectItem value="landscape">{t('filters.orientation.landscape')}</SelectItem>
                  <SelectItem value="portrait">{t('filters.orientation.portrait')}</SelectItem>
                  <SelectItem value="square">{t('filters.orientation.square')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">{t('filters.gps.label')}</Label>
              <Select
                value={draft.hasGps}
                onValueChange={(value) =>
                  setDraft((prev) => ({ ...prev, hasGps: value as HasGpsValue }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.gps.all')}</SelectItem>
                  <SelectItem value="yes">{t('filters.gps.yes')}</SelectItem>
                  <SelectItem value="no">{t('filters.gps.no')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">{t('filters.from')}</Label>
              <Input
                type="date"
                value={draft.dateFrom}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, dateFrom: event.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">{t('filters.to')}</Label>
              <Input
                type="date"
                value={draft.dateTo}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, dateTo: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">{t('filters.camera')}</Label>
              <Input
                value={draft.camera}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, camera: event.target.value }))
                }
                placeholder="Sony A7R5..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">{t('filters.lens')}</Label>
              <Input
                value={draft.lens}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, lens: event.target.value }))
                }
                placeholder="24-70mm f/2.8..."
              />
            </div>
          </div>
        </div>

        <SheetFooter className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <Button type="button" variant="ghost" onClick={handleClear}>
            {t('filters.clear')}
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            {t('filters.apply')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
