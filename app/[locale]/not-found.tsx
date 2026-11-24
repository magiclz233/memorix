import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function NotFound() {
  const t = await getTranslations('common.notFound');

  return (
    <main className="flex min-h-[75vh] flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <Compass className="h-8 w-8 text-indigo-500" />
      </div>
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400">
        404
      </p>
      <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 md:text-4xl">
        {t('title')}
      </h1>
      <p className="mt-3 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
        {t('description')}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild className="rounded-full bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            <span>{t('backHome')}</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/gallery">{t('goGallery')}</Link>
        </Button>
      </div>
    </main>
  );
}
