import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { GalleryVerticalEnd } from 'lucide-react';

import { SignupForm } from '@/components/signup-form';
import { LocaleSwitcher } from '@/components/locale-switcher';

export default async function SignupPage() {
  const t = await getTranslations('auth.signupPage');

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
            <SignupForm />
          </div>
        </div>
      </div>
    </div>
  );
}
