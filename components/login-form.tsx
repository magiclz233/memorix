import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { stripLocalePrefix, withLocalePrefix } from '@/i18n/paths';

import { LoginFormFields } from '@/components/login-form-fields';
import { GitHubSignInButton } from '@/components/github-signin-button';
import { cn } from '@/lib/utils';

type LoginFormProps = React.ComponentPropsWithoutRef<'div'> & {
  redirectTo?: string;
};

export async function LoginForm({
  className,
  redirectTo = '/gallery',
  ...props
}: LoginFormProps) {
  const t = await getTranslations('auth.login');
  const locale = await getLocale();
  const trimmedRedirectTo = redirectTo.trim();
  const rawRedirectTo = trimmedRedirectTo.startsWith('/')
    ? trimmedRedirectTo
    : '/gallery';
  const safeRedirectTo = stripLocalePrefix(rawRedirectTo);
  const githubRedirectTo = withLocalePrefix(safeRedirectTo, locale);
  const signupHref = `/signup?callbackUrl=${encodeURIComponent(safeRedirectTo)}`;

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <div className='flex flex-col items-center gap-2 text-center'>
        <h1 className='text-2xl font-bold'>{t('title')}</h1>
        <p className='text-balance text-sm text-muted-foreground'>
          {t('subtitle')}
        </p>
      </div>
      <div className='grid gap-6'>
        <LoginFormFields redirectTo={safeRedirectTo} />
        <div className='relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border'>
          <span className='relative z-10 bg-background px-2 text-muted-foreground'>
            {t('divider')}
          </span>
        </div>
        <GitHubSignInButton redirectTo={githubRedirectTo} />
      </div>
      <div className='text-center text-sm'>
        {t('noAccount')}{' '}
        <Link href={signupHref} className='underline underline-offset-4'>
          {t('signupLink')}
        </Link>
      </div>
    </div>
  );
}
