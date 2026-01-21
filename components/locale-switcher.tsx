'use client';

import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { cn } from '@/lib/utils';

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
  const locale = useLocale();
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const href = query ? `${pathname}?${query}` : pathname;

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      {routing.locales.map((targetLocale) => {
        const isActive = targetLocale === locale;
        const label = targetLocale === 'zh-CN' ? '中' : 'EN';

        return (
          <Link
            key={targetLocale}
            href={href}
            locale={targetLocale}
            className={cn(itemClassName, isActive && activeItemClassName)}
            aria-current={isActive ? 'page' : undefined}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
