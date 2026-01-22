'use client';

import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export function GalleryHeader() {
  const t = useTranslations('front.gallery');

  return (
    <header className='front-fade-up space-y-4'>
      <p className='text-xs uppercase tracking-[0.4em] text-zinc-600/80 dark:text-white/60'>
        {t('eyebrow')}
      </p>
      <h1
        className={cn(
          'font-serif',
          'text-4xl font-semibold text-zinc-800/90 dark:text-white/85 md:text-5xl',
        )}
      >
        {t('title')}
      </h1>
      <p className='max-w-2xl text-sm text-zinc-600/80 dark:text-white/60'>
        {t('description')}
      </p>
    </header>
  );
}
