import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { GalleryVerticalEnd } from 'lucide-react';

import { LoginForm } from '@/components/login-form';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { DotPattern } from '@/components/ui/dot-pattern';
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
  const t = await getTranslations('auth.loginPage');
  const params = await searchParams;
  const rawCallbackUrl = resolveRedirect(params?.callbackUrl);
  const callbackUrl =
    rawCallbackUrl && rawCallbackUrl.length > 0 ? rawCallbackUrl : '/gallery';

  return (
    <div className='grid min-h-svh lg:grid-cols-2'>
      <div className='bg-zinc-900 relative hidden lg:flex flex-col items-center justify-center overflow-hidden p-10 text-white'>
        <DotPattern
          className={cn(
            "[mask-image:radial-gradient(600px_circle_at_center,white,transparent)]",
            "fill-white/20"
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-4 max-w-lg">
           <div className="p-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl mb-8">
             <GalleryVerticalEnd className="size-12 text-white" />
           </div>
           <h1 className="text-4xl font-serif font-bold tracking-tight">
             {t('appName')}
           </h1>
           <p className="text-lg text-white/70 font-light">
             {t('heroAlt')}
           </p>
        </div>
      </div>
      <div className='flex flex-col gap-4 p-6 md:p-10'>
        <div className='flex items-center justify-between gap-2 lg:hidden'>
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
            <LoginForm redirectTo={callbackUrl} />
          </div>
        </div>
      </div>
    </div>
  );
}
