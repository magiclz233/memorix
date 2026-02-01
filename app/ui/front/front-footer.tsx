'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const footerLinks = [
  { key: 'home', href: '/' },
  { key: 'gallery', href: '/gallery' },
  { key: 'collections', href: '/collections' },
  { key: 'about', href: '/about' },
];

export function FrontFooter() {
  const t = useTranslations('front.footer');

  return (
    <footer className='front-footer relative z-10 mt-8 border-t border-zinc-200 px-6 py-3 text-sm text-zinc-600/80 dark:border-zinc-800 dark:text-white/60'>
      <div className='mx-auto flex w-[88vw] max-w-none flex-col gap-6 md:flex-row md:items-center md:justify-between'>
        <div className='space-y-2'>
          <p
            className={cn(
              'font-serif',
              'text-base text-zinc-900 dark:text-white',
            )}
          >
            {t('title')}
          </p>
          <p>{t('subtitle')}</p>
        </div>
        <div className='flex flex-wrap gap-4 text-xs uppercase tracking-[0.2em]'>
          {footerLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className='transition hover:text-zinc-900 dark:hover:text-white'
            >
              {t(`links.${item.key}`)}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
