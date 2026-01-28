'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTransition, useState } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  ArrowUpDown, 
  CheckCircle2, 
  FileType,
  ChevronDown,
  X,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function MediaFilterBar() {
  const t = useTranslations('dashboard.media.filters');
  const sortT = useTranslations('dashboard.media.sort');
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [filters, setFilters] = useState(() => ({
    q: searchParams.get('q') || '',
    type: searchParams.get('type') || 'all',
    status: searchParams.get('status') || 'all',
    sort: searchParams.get('sort') || 'dateShotDesc',
    orientation: searchParams.get('orientation') || 'all',
    hasGps: searchParams.get('hasGps') || 'all',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    sizeMin: searchParams.get('sizeMin') || '',
    sizeMax: searchParams.get('sizeMax') || '',
    widthMin: searchParams.get('widthMin') || '',
    widthMax: searchParams.get('widthMax') || '',
    heightMin: searchParams.get('heightMin') || '',
    heightMax: searchParams.get('heightMax') || '',
    exposureMin: searchParams.get('exposureMin') || '',
    exposureMax: searchParams.get('exposureMax') || '',
    apertureMin: searchParams.get('apertureMin') || '',
    apertureMax: searchParams.get('apertureMax') || '',
    isoMin: searchParams.get('isoMin') || '',
    isoMax: searchParams.get('isoMax') || '',
    focalLengthMin: searchParams.get('focalLengthMin') || '',
    focalLengthMax: searchParams.get('focalLengthMax') || '',
    camera: searchParams.get('camera') || '',
    maker: searchParams.get('maker') || '',
    lens: searchParams.get('lens') || '',
  }));
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(() => Boolean(
    searchParams.get('sizeMin') ||
      searchParams.get('sizeMax') ||
      searchParams.get('widthMin') ||
      searchParams.get('widthMax') ||
      searchParams.get('heightMin') ||
      searchParams.get('heightMax') ||
      searchParams.get('exposureMin') ||
      searchParams.get('exposureMax') ||
      searchParams.get('apertureMin') ||
      searchParams.get('apertureMax') ||
      searchParams.get('isoMin') ||
      searchParams.get('isoMax') ||
      searchParams.get('focalLengthMin') ||
      searchParams.get('focalLengthMax') ||
      searchParams.get('camera') ||
      searchParams.get('maker') ||
      searchParams.get('lens') ||
      (searchParams.get('hasGps') && searchParams.get('hasGps') !== 'all') ||
      (searchParams.get('orientation') && searchParams.get('orientation') !== 'all')
  ));

  const updateLocalFilter = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const keysToRemove = [
    'q',
    'type',
    'status',
    'dateFrom',
    'dateTo',
    'sort',
    'orientation',
    'hasGps',
    'sizeMin',
    'sizeMax',
    'widthMin',
    'widthMax',
    'heightMin',
    'heightMax',
    'exposureMin',
    'exposureMax',
    'apertureMin',
    'apertureMax',
    'isoMin',
    'isoMax',
    'focalLengthMin',
    'focalLengthMax',
    'camera',
    'maker',
    'lens',
  ];

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams);
    keysToRemove.forEach((key) => params.delete(key));

    const next = {
      q: filters.q.trim(),
      type: filters.type,
      status: filters.status,
      sort: filters.sort,
      orientation: filters.orientation,
      hasGps: filters.hasGps,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      sizeMin: filters.sizeMin,
      sizeMax: filters.sizeMax,
      widthMin: filters.widthMin,
      widthMax: filters.widthMax,
      heightMin: filters.heightMin,
      heightMax: filters.heightMax,
      exposureMin: filters.exposureMin,
      exposureMax: filters.exposureMax,
      apertureMin: filters.apertureMin,
      apertureMax: filters.apertureMax,
      isoMin: filters.isoMin,
      isoMax: filters.isoMax,
      focalLengthMin: filters.focalLengthMin,
      focalLengthMax: filters.focalLengthMax,
      camera: filters.camera.trim(),
      maker: filters.maker.trim(),
      lens: filters.lens.trim(),
    };

    Object.entries(next).forEach(([key, value]) => {
      if (!value || value === 'all') return;
      if (key === 'sort' && value === 'dateShotDesc') return;
      params.set(key, value);
    });

    params.delete('page');
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  const handleClearFilters = () => {
    const params = new URLSearchParams(searchParams);
    keysToRemove.forEach((key) => params.delete(key));

    setFilters({
      q: '',
      type: 'all',
      status: 'all',
      sort: 'dateShotDesc',
      orientation: 'all',
      hasGps: 'all',
      dateFrom: '',
      dateTo: '',
      sizeMin: '',
      sizeMax: '',
      widthMin: '',
      widthMax: '',
      heightMin: '',
      heightMax: '',
      exposureMin: '',
      exposureMax: '',
      apertureMin: '',
      apertureMax: '',
      isoMin: '',
      isoMax: '',
      focalLengthMin: '',
      focalLengthMax: '',
      camera: '',
      maker: '',
      lens: '',
    });

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  const hasAdvancedFilters = Boolean(
    filters.sizeMin ||
      filters.sizeMax ||
      filters.widthMin ||
      filters.widthMax ||
      filters.heightMin ||
      filters.heightMax ||
      filters.exposureMin ||
      filters.exposureMax ||
      filters.apertureMin ||
      filters.apertureMax ||
      filters.isoMin ||
      filters.isoMax ||
      filters.focalLengthMin ||
      filters.focalLengthMax ||
      filters.camera ||
      filters.maker ||
      filters.lens ||
      filters.hasGps !== 'all' ||
      filters.orientation !== 'all'
  );
  
  const setDatePreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    updateLocalFilter('dateFrom', fmt(start));
    updateLocalFilter('dateTo', fmt(end));
  };

  const hasActiveFilters = 
    filters.q || 
    filters.type !== 'all' || 
    filters.status !== 'all' || 
    filters.orientation !== 'all' ||
    filters.hasGps !== 'all' ||
    filters.dateFrom || 
    filters.dateTo ||
    filters.sizeMin ||
    filters.sizeMax ||
    filters.widthMin ||
    filters.widthMax ||
    filters.heightMin ||
    filters.heightMax ||
    filters.exposureMin ||
    filters.exposureMax ||
    filters.apertureMin ||
    filters.apertureMax ||
    filters.isoMin ||
    filters.isoMax ||
    filters.focalLengthMin ||
    filters.focalLengthMax ||
    filters.camera ||
    filters.maker ||
    filters.lens;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="flex flex-wrap items-center gap-3">
        {/* Type Filter */}
        <Select value={filters.type} onValueChange={(v) => updateLocalFilter('type', v)}>
          <SelectTrigger className="h-9 w-auto min-w-[100px] gap-2 rounded-full border-dashed bg-white/50 px-3 text-xs font-medium dark:bg-zinc-900/50 [&>span]:line-clamp-1">
             <div className="flex items-center gap-2">
                <FileType className="h-3.5 w-3.5 text-zinc-500" />
                <span>{t('type.label')}</span>
                {filters.type !== 'all' && (
                  <span className="ml-1 inline-flex h-5 items-center rounded-full bg-indigo-50 px-1.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                    {t(`type.${filters.type}`)}
                  </span>
                )}
             </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('type.all')}</SelectItem>
            <SelectItem value="image">{t('type.image')}</SelectItem>
            <SelectItem value="video">{t('type.video')}</SelectItem>
            <SelectItem value="animated">{t('type.animated')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={filters.status} onValueChange={(v) => updateLocalFilter('status', v)}>
          <SelectTrigger className="h-9 w-auto min-w-[100px] gap-2 rounded-full border-dashed bg-white/50 px-3 text-xs font-medium dark:bg-zinc-900/50 [&>span]:line-clamp-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-zinc-500" />
              <span>{t('status.label')}</span>
              {filters.status !== 'all' && (
                <span className="ml-1 inline-flex h-5 items-center rounded-full bg-emerald-50 px-1.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  {t(`status.${filters.status}`)}
                </span>
              )}
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('status.all')}</SelectItem>
            <SelectItem value="published">{t('status.published')}</SelectItem>
            <SelectItem value="unpublished">{t('status.unpublished')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Filter (Popover) */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 rounded-full border-dashed gap-2 px-3 bg-white/50 dark:bg-zinc-900/50">
              <Calendar className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-xs font-medium">{t('dateShot')}</span>
              {(filters.dateFrom || filters.dateTo) && (
                <span className="inline-flex items-center rounded-full border border-transparent font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-secondary/80 h-5 px-1.5 text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 border-amber-100 dark:border-amber-500/20">
                  {filters.dateFrom || '...'} - {filters.dateTo || '...'}
                </span>
              )}
              <ChevronDown className="h-3 w-3 text-zinc-400 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[260px] p-3">
            <div className="flex flex-col gap-3">
              <div className="grid gap-1.5">
                 <h4 className="font-medium leading-none text-sm">{t('dateShot')}</h4>
              </div>
              <div className="flex flex-wrap gap-1 mb-1">
                 {/* Presets */}
                 <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => setDatePreset(7)}>7 Days</Button>
                 <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => setDatePreset(30)}>30 Days</Button>
                 <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => {
                  const now = new Date();
                  const start = new Date(now.getFullYear(), now.getMonth(), 1);
                  updateLocalFilter('dateFrom', start.toISOString().split('T')[0]);
                  updateLocalFilter('dateTo', now.toISOString().split('T')[0]);
                }}>This Month</Button>
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs text-zinc-500">{t('from')}</label>
                <Input 
                  type="date" 
                  value={filters.dateFrom} 
                  onChange={(e) => updateLocalFilter('dateFrom', e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs text-zinc-500">{t('to')}</label>
                <Input 
                  type="date" 
                  value={filters.dateTo} 
                  onChange={(e) => updateLocalFilter('dateTo', e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs" onClick={() => {
                  updateLocalFilter('dateFrom', '');
                  updateLocalFilter('dateTo', '');
                }}>
                  {t('clear')}
                </Button>
                <Button size="sm" className="flex-1 h-7 text-xs" onClick={applyFilters}>
                  {t('apply')}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsAdvancedOpen((prev) => !prev)}
          className={cn(
            "h-9 gap-2 text-zinc-500",
            hasAdvancedFilters && "text-indigo-600"
          )}
        >
          <Filter className="h-3.5 w-3.5" />
          <span className="text-xs">{t('advanced')}</span>
          <ChevronDown className={cn("h-3.5 w-3.5 transition", isAdvancedOpen && "rotate-180")} />
        </Button>

        {/* Sort */}
        <Select value={filters.sort} onValueChange={(v) => updateLocalFilter('sort', v)}>
          <SelectTrigger className="h-9 w-auto min-w-[100px] gap-2 border-none bg-transparent px-3 text-xs text-zinc-500 shadow-none hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:ring-0 [&>svg:last-child]:hidden">
             <div className="flex items-center gap-2">
               <ArrowUpDown className="h-3.5 w-3.5" />
               <span>
                 {filters.sort === 'dateShotDesc' ? t('sortLabel') : sortT(filters.sort)}
               </span>
             </div>
          </SelectTrigger>
          <SelectContent align="end">
             <SelectItem value="dateShotDesc">{sortT('dateShotDesc')}</SelectItem>
             <SelectItem value="dateShotAsc">{sortT('dateShotAsc')}</SelectItem>
             <SelectItem value="sizeDesc">{sortT('sizeDesc')}</SelectItem>
             <SelectItem value="sizeAsc">{sortT('sizeAsc')}</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <Input
            value={filters.q}
            onChange={(e) => updateLocalFilter('q', e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="pl-8 h-8 text-xs rounded-full bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
          />
          {filters.q && (
            <button 
              onClick={() => updateLocalFilter('q', '')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-full px-3 text-xs"
          onClick={applyFilters}
        >
          {t('search')}
        </Button>

        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClearFilters}
            className="h-8 rounded-full px-3 text-xs text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <X className="h-3.5 w-3.5" />
            <span className="ml-1">{t('clearFilters')}</span>
          </Button>
        )}
      </div>
      <div
        className={cn(
          "grid gap-4 rounded-xl border border-zinc-200 bg-white/70 p-4 text-xs text-zinc-600 shadow-sm transition-all dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300",
          isAdvancedOpen ? "opacity-100" : "max-h-0 overflow-hidden border-transparent p-0 opacity-0"
        )}
      >
        <div className="flex flex-wrap gap-3">
          <div className="min-w-[160px] flex-1 space-y-2">
            <label className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">{t('gps.label')}</label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filters.hasGps === 'all' ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => updateLocalFilter('hasGps', 'all')}
              >
                {t('gps.all')}
              </Button>
              <Button
                variant={filters.hasGps === 'yes' ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs gap-2"
                onClick={() => updateLocalFilter('hasGps', 'yes')}
              >
                <MapPin className="h-3 w-3" />
                {t('gps.yes')}
              </Button>
              <Button
                variant={filters.hasGps === 'no' ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs gap-2"
                onClick={() => updateLocalFilter('hasGps', 'no')}
              >
                <span className="w-3 text-center">-</span>
                {t('gps.no')}
              </Button>
            </div>
          </div>
          <div className="min-w-[160px] flex-1 space-y-2">
            <label className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">{t('orientation.label')}</label>
            <div className="flex flex-wrap gap-2">
              {['all', 'landscape', 'portrait', 'square'].map((o) => (
                <Button
                  key={o}
                  variant={filters.orientation === o ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => updateLocalFilter('orientation', o)}
                >
                  {t(`orientation.${o}`)}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">{t('size')}</label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                value={filters.sizeMin}
                onChange={(e) => updateLocalFilter('sizeMin', e.target.value)}
                placeholder={t('min')}
                className="h-8 text-xs"
              />
              <Input
                type="number"
                value={filters.sizeMax}
                onChange={(e) => updateLocalFilter('sizeMax', e.target.value)}
                placeholder={t('max')}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">{t('resolutionWidth')}</label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                value={filters.widthMin}
                onChange={(e) => updateLocalFilter('widthMin', e.target.value)}
                placeholder={t('min')}
                className="h-8 text-xs"
              />
              <Input
                type="number"
                value={filters.widthMax}
                onChange={(e) => updateLocalFilter('widthMax', e.target.value)}
                placeholder={t('max')}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">{t('resolutionHeight')}</label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                value={filters.heightMin}
                onChange={(e) => updateLocalFilter('heightMin', e.target.value)}
                placeholder={t('min')}
                className="h-8 text-xs"
              />
              <Input
                type="number"
                value={filters.heightMax}
                onChange={(e) => updateLocalFilter('heightMax', e.target.value)}
                placeholder={t('max')}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">{t('camera')}</label>
            <Input
              value={filters.camera}
              onChange={(e) => updateLocalFilter('camera', e.target.value)}
              placeholder={t('example', { value: 'Sony A7R V' })}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">{t('maker')}</label>
            <Input
              value={filters.maker}
              onChange={(e) => updateLocalFilter('maker', e.target.value)}
              placeholder={t('example', { value: 'Canon' })}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">{t('lens')}</label>
            <Input
              value={filters.lens}
              onChange={(e) => updateLocalFilter('lens', e.target.value)}
              placeholder={t('example', { value: '24-70mm' })}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">{t('shutter')}</label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                step="0.0001"
                value={filters.exposureMin}
                onChange={(e) => updateLocalFilter('exposureMin', e.target.value)}
                placeholder={t('min')}
                className="h-8 text-xs"
              />
              <Input
                type="number"
                step="0.0001"
                value={filters.exposureMax}
                onChange={(e) => updateLocalFilter('exposureMax', e.target.value)}
                placeholder={t('max')}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">{t('aperture')}</label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                step="0.1"
                value={filters.apertureMin}
                onChange={(e) => updateLocalFilter('apertureMin', e.target.value)}
                placeholder={t('min')}
                className="h-8 text-xs"
              />
              <Input
                type="number"
                step="0.1"
                value={filters.apertureMax}
                onChange={(e) => updateLocalFilter('apertureMax', e.target.value)}
                placeholder={t('max')}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">{t('iso')}</label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                step="1"
                value={filters.isoMin}
                onChange={(e) => updateLocalFilter('isoMin', e.target.value)}
                placeholder={t('min')}
                className="h-8 text-xs"
              />
              <Input
                type="number"
                step="1"
                value={filters.isoMax}
                onChange={(e) => updateLocalFilter('isoMax', e.target.value)}
                placeholder={t('max')}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">{t('focalLength')}</label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                step="0.1"
                value={filters.focalLengthMin}
                onChange={(e) => updateLocalFilter('focalLengthMin', e.target.value)}
                placeholder={t('min')}
                className="h-8 text-xs"
              />
              <Input
                type="number"
                step="0.1"
                value={filters.focalLengthMax}
                onChange={(e) => updateLocalFilter('focalLengthMax', e.target.value)}
                placeholder={t('max')}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
