import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { GalleryVerticalEnd } from 'lucide-react';

import { LoginForm } from '@/components/login-form';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { ModeToggle } from '@/components/theme-toggle';
import { DotPattern } from '@/components/ui/dot-pattern';
import { fetchPublicSystemSettings } from '@/app/lib/data';
import { resolveSiteName } from '@/app/lib/site-brand';
import { cn } from '@/lib/utils';

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string | string[];
  }>;
};

const resolveRedirect = (value?: string | string[]) => {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value[0]?.trim();
  return '';
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [locale, t, params] = await Promise.all([
    getLocale(),
    getTranslations('auth.loginPage'),
    searchParams,
  ]);

  let settings = null;
  try {
    settings = await fetchPublicSystemSettings(locale);
  } catch {
    settings = null;
  }
  const siteName = resolveSiteName(settings?.siteName);

  const rawCallbackUrl = resolveRedirect(params?.callbackUrl);
  const callbackUrl =
    rawCallbackUrl && rawCallbackUrl.length > 0 ? rawCallbackUrl : '/gallery';

  return (
    <div className='grid min-h-svh lg:grid-cols-2'>
      <div className='relative hidden flex-col items-center justify-center overflow-hidden bg-zinc-950 p-10 text-white lg:flex'>
        <DotPattern
          className={cn(
            '[mask-image:radial-gradient(600px_circle_at_center,white,transparent)]',
            'fill-indigo-400/20',
          )}
        />
        <div className='absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent' />

        <div className='relative z-10 flex max-w-lg flex-col items-center space-y-4 text-center'>
          <div className='mb-6 rounded-2xl border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-xl'>
            <GalleryVerticalEnd className='size-12 text-white' />
          </div>
          <h1 className='font-serif text-4xl font-bold tracking-tight'>
            {siteName}
          </h1>
          <p className='text-base font-light text-white/70'>
            {t('subtitle')}
          </p>
        </div>
      </div>

      <div className='flex flex-col gap-4 bg-zinc-50 p-6 dark:bg-zinc-950 md:p-10'>
        <div className='flex items-center justify-between gap-2'>
          <Link href='/' className='flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-100'>
            <div className='flex size-7 items-center justify-center rounded-lg bg-indigo-600 text-white'>
              <GalleryVerticalEnd className='size-4' />
            </div>
            <span className='font-serif font-semibold tracking-tight'>{siteName}</span>
          </Link>
          <div className='flex items-center gap-2'>
            <LocaleSwitcher
              className='h-8 w-8 rounded-full border border-zinc-200/80 bg-white/80 text-[10px] font-semibold text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200'
              itemClassName='rounded-md px-2 py-1 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800'
              activeItemClassName='bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white'
            />
            <ModeToggle className='h-8 w-8' />
          </div>
        </div>
        <div className='flex flex-1 items-center justify-center'>
          <div className='w-full max-w-md'>
            <LoginForm redirectTo={callbackUrl} />
          </div>
        </div>
      </div>
    </div>
  );
}
