'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('common.errorPage');

  useEffect(() => {
    console.error('Unhandled route error:', error);
  }, [error]);

  return (
    <main className="flex min-h-[75vh] flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/30">
        <AlertTriangle className="h-8 w-8 text-rose-500" />
      </div>
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        {t('title')}
      </h1>
      <p className="mt-3 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
        {t('description')}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          <RotateCw className="h-4 w-4" />
          <span>{t('retry')}</span>
        </Button>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/">{t('backHome')}</Link>
        </Button>
      </div>
    </main>
  );
}
