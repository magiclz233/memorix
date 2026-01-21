import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { GalleryVerticalEnd } from 'lucide-react';

import { LoginForm } from '@/components/login-form';
import { LocaleSwitcher } from '@/components/locale-switcher';

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
  const t = await getTranslations('auth.loginPage');
  const params = await searchParams;
  const rawCallbackUrl = resolveRedirect(params?.callbackUrl);
  const callbackUrl =
    rawCallbackUrl && rawCallbackUrl.length > 0 ? rawCallbackUrl : '/gallery';

  return (
    <div className='grid min-h-svh lg:grid-cols-2'>
      <div className='bg-muted relative hidden lg:block'>
        <img
          src='/hero-desktop.png'
          alt={t('heroAlt')}
          className='absolute inset-0 h-full w-full object-cover'
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
            className='rounded-full border border-zinc-200/70 bg-white/80 px-1 text-[10px] uppercase tracking-[0.25em] text-zinc-600 shadow-sm dark:border-white/15 dark:bg-white/10 dark:text-white/70'
            itemClassName='rounded-full px-2 py-1 transition hover:text-zinc-900 dark:hover:text-white'
            activeItemClassName='bg-zinc-100 text-zinc-900 dark:bg-white/15 dark:text-white'
          />
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
