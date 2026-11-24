'use client';

import { useId, useMemo, useState, useTransition } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  buildListQuery,
  generatePagination,
  LIST_PAGE_SIZE_OPTIONS,
} from '@/app/lib/list-view';
import { usePathname, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export type ListPaginationProps = {
  page: number;
  totalPages: number;
  pageSize: number;
  totalCount?: number;
  pageSizeOptions?: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * 管理端统一分页栏：总数、每页数量、跳页、页码导航。
 * 纯展示 + 回调，服务端列表与客户端列表共用。
 */
export function ListPagination({
  page,
  totalPages,
  pageSize,
  totalCount,
  pageSizeOptions = LIST_PAGE_SIZE_OPTIONS,
  onPageChange,
  onPageSizeChange,
  disabled = false,
  className,
}: ListPaginationProps) {
  const t = useTranslations('common.list');
  const jumpInputId = useId();
  const [jumpInvalid, setJumpInvalid] = useState(false);

  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(page, 1), safeTotalPages);
  const pages = useMemo(
    () => generatePagination(safePage, safeTotalPages),
    [safePage, safeTotalPages],
  );

  const goToPage = (nextPage: number) => {
    if (disabled) return;
    const clamped = Math.min(Math.max(nextPage, 1), safeTotalPages);
    if (clamped !== safePage) {
      onPageChange(clamped);
    }
  };

  const handleJump = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const parsed = Number(formData.get('page'));
    if (
      !Number.isSafeInteger(parsed) ||
      parsed < 1 ||
      parsed > safeTotalPages
    ) {
      setJumpInvalid(true);
      return;
    }

    setJumpInvalid(false);
    goToPage(parsed);
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60',
        className,
      )}
    >
      <div className='flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400'>
        {typeof totalCount === 'number' ? (
          <span className='font-mono tabular-nums'>{t('total', { count: totalCount })}</span>
        ) : null}
        <span className='font-mono tabular-nums'>{t('pageIndicator', { page: safePage, total: safeTotalPages })}</span>
        <label className='flex items-center gap-1.5'>
          <span>{t('perPage')}</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
            disabled={disabled}
          >
            <SelectTrigger
              className='h-8 w-[88px] text-xs'
              aria-label={t('perPage')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {t('perPageOption', { count: size })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-1'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='hidden h-8 w-8 p-0 sm:inline-flex'
            onClick={() => goToPage(1)}
            disabled={disabled || safePage <= 1}
            aria-label={t('first')}
            title={t('first')}
          >
            <ChevronsLeft className='h-4 w-4' />
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-8 w-8 p-0'
            onClick={() => goToPage(safePage - 1)}
            disabled={disabled || safePage <= 1}
            aria-label={t('prev')}
            title={t('prev')}
          >
            <ChevronLeft className='h-4 w-4' />
          </Button>

          <div className='hidden items-center gap-1 sm:flex'>
            {pages.map((item, index) =>
              item === '...' ? (
                <span
                  key={`ellipsis-${index}`}
                  className='px-1 text-zinc-400 dark:text-zinc-500'
                  aria-hidden='true'
                >
                  ...
                </span>
              ) : (
                <Button
                  key={item}
                  type='button'
                  variant={item === safePage ? 'default' : 'outline'}
                  size='sm'
                  className='h-8 min-w-8 px-2 text-xs'
                  onClick={() => goToPage(item)}
                  disabled={disabled}
                  aria-current={item === safePage ? 'page' : undefined}
                >
                  {item}
                </Button>
              ),
            )}
          </div>

          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-8 w-8 p-0'
            onClick={() => goToPage(safePage + 1)}
            disabled={disabled || safePage >= safeTotalPages}
            aria-label={t('next')}
            title={t('next')}
          >
            <ChevronRight className='h-4 w-4' />
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='hidden h-8 w-8 p-0 sm:inline-flex'
            onClick={() => goToPage(safeTotalPages)}
            disabled={disabled || safePage >= safeTotalPages}
            aria-label={t('last')}
            title={t('last')}
          >
            <ChevronsRight className='h-4 w-4' />
          </Button>
        </div>

        {safeTotalPages > 1 ? (
          <form onSubmit={handleJump} className='flex items-center gap-1.5'>
            <label
              htmlFor={jumpInputId}
              className='text-xs text-zinc-500 dark:text-zinc-400'
            >
              {t('jumpTo')}
            </label>
            <Input
              key={safePage}
              id={jumpInputId}
              name='page'
              type='number'
              inputMode='numeric'
              min={1}
              max={safeTotalPages}
              defaultValue={safePage}
              onChange={() => setJumpInvalid(false)}
              disabled={disabled}
              aria-invalid={jumpInvalid || undefined}
              title={
                jumpInvalid ? t('invalidPage', { total: safeTotalPages }) : undefined
              }
              className={cn(
                'h-8 w-16 text-center text-xs',
                jumpInvalid &&
                  'border-red-500 focus-visible:ring-red-500 dark:border-red-500',
              )}
            />
            <Button
              type='submit'
              variant='outline'
              size='sm'
              className='h-8 px-2 text-xs'
              disabled={disabled}
            >
              {t('jumpAction')}
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

type ServerListPaginationProps = Omit<
  ListPaginationProps,
  'onPageChange' | 'onPageSizeChange' | 'disabled'
>;

/**
 * 服务端分页列表的 URL 包装：更新 page/limit 并保留现有筛选参数。
 * 切换每页数量时回到第 1 页。
 */
export function ServerListPagination({
  page,
  totalPages,
  pageSize,
  totalCount,
  pageSizeOptions,
  className,
}: ServerListPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const navigate = (nextPage: number, nextPageSize: number) => {
    const params = buildListQuery(
      new URLSearchParams(searchParams.toString()),
      { page: nextPage, pageSize: nextPageSize },
    );
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: true });
    });
  };

  return (
    <ListPagination
      page={page}
      totalPages={totalPages}
      pageSize={pageSize}
      totalCount={totalCount}
      pageSizeOptions={pageSizeOptions}
      onPageChange={(nextPage) => navigate(nextPage, pageSize)}
      onPageSizeChange={(nextPageSize) => navigate(1, nextPageSize)}
      disabled={isPending}
      className={className}
    />
  );
}
