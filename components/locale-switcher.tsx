'use client';

import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type LocaleSwitcherProps = {
  className?: string;
  itemClassName?: string;
  activeItemClassName?: string;
};

export function LocaleSwitcher({
  className,
  itemClassName,
  activeItemClassName,
}: LocaleSwitcherProps) {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locale = useLocale();
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const href = query ? `${pathname}?${query}` : pathname;
  const localeLabels: Record<string, string> = {
    'zh-CN': '中文',
    en: 'English',
  };
  const localeShortLabels: Record<string, string> = {
    'zh-CN': '中',
    en: 'EN',
  };
  const currentLabel = localeShortLabels[locale] ?? locale;
  const currentFullLabel = localeLabels[locale] ?? locale;

  const clearCloseTimer = () => {
    if (!closeTimerRef.current) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  };

  const handleOpen = () => {
    clearCloseTimer();
    setOpen(true);
  };

  const handleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
    }, 120);
  };

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, []);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type='button'
          className={cn('inline-flex items-center justify-center gap-0.5', className)}
          aria-label='切换语言'
          title={currentFullLabel}
          onMouseEnter={handleOpen}
          onMouseLeave={handleClose}
        >
          <span>{currentLabel}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        side='bottom'
        sideOffset={8}
        avoidCollisions={false}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
      >
        {routing.locales.map((targetLocale) => {
          const isActive = targetLocale === locale;
          const label = localeLabels[targetLocale] ?? targetLocale;

          return (
            <DropdownMenuItem
              key={targetLocale}
              asChild
              className={cn(itemClassName, isActive && activeItemClassName)}
            >
              <Link
                href={href}
                locale={targetLocale}
                aria-current={isActive ? 'page' : undefined}
              >
                {label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
