import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { GalleryVerticalEnd } from 'lucide-react';

import { SignupForm } from '@/components/signup-form';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { fetchPublicSystemSettings } from '@/app/lib/data';
import { Button } from '@/components/ui/button';

export default async function SignupPage() {
  const t = await getTranslations('auth.signupPage');
  const locale = await getLocale();
  const settings = await fetchPublicSystemSettings(locale);
  const signupEnabled = settings?.publicAccess !== false;

  return (
    <div className='grid min-h-svh lg:grid-cols-2'>
      <div className='bg-muted relative hidden lg:block'>
        <Image
          src='/hero-desktop.png'
          alt={t('heroAlt')}
          fill
          sizes='(max-width: 1024px) 0px, 50vw'
          className='object-cover'
          priority
        />
      </div>
      <div className='flex flex-col gap-4 p-6 md:p-10'>
        <div className='flex items-center justify-between gap-2'>
          <Link href='/' className='flex items-center gap-2 font-medium'>
            <div className='bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md'>
              <GalleryVerticalEnd className='size-4' />
            </div>
            {t('appName')}
          </Link>
          <LocaleSwitcher
            className='h-8 w-8 rounded-full border border-zinc-200/70 bg-white/80 text-[10px] font-semibold text-zinc-700 shadow-sm dark:border-white/15 dark:bg-white/10 dark:text-white/80'
            itemClassName='rounded-md px-2 py-1 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-white/10'
            activeItemClassName='bg-zinc-100 text-zinc-900 dark:bg-white/15 dark:text-white'
          />
        </div>
        <div className='flex flex-1 items-center justify-center'>
          <div className='w-full max-w-md'>
            {signupEnabled ? (
              <SignupForm />
            ) : (
              <div className='rounded-2xl border border-zinc-200 bg-white/80 p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60'>
                <h1 className='text-xl font-semibold text-zinc-900 dark:text-zinc-100'>
                  {t('closedTitle')}
                </h1>
                <p className='mt-2 text-sm text-zinc-600 dark:text-zinc-300'>
                  {t('closedDescription')}
                </p>
                <Button asChild className='mt-6 w-full'>
                  <Link href='/login'>{t('goToLogin')}</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
