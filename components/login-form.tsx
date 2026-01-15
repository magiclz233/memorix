import Link from 'next/link';

import { LoginFormFields } from '@/components/login-form-fields';
import { GitHubSignInButton } from '@/components/github-signin-button';
import { cn } from '@/lib/utils';

type LoginFormProps = React.ComponentPropsWithoutRef<'div'> & {
  redirectTo?: string;
};

export function LoginForm({
  className,
  redirectTo = '/gallery',
  ...props
}: LoginFormProps) {
  const trimmedRedirectTo = redirectTo.trim();
  const safeRedirectTo = trimmedRedirectTo.length > 0 ? trimmedRedirectTo : '/gallery';

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <div className='flex flex-col items-center gap-2 text-center'>
        <h1 className='text-2xl font-bold'>Login to your account</h1>
        <p className='text-balance text-sm text-muted-foreground'>
          Enter your email below to login to your account
        </p>
      </div>
      <div className='grid gap-6'>
        <LoginFormFields redirectTo={safeRedirectTo} />
        <div className='relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border'>
          <span className='relative z-10 bg-background px-2 text-muted-foreground'>
            Or continue with
          </span>
        </div>
        <GitHubSignInButton redirectTo={safeRedirectTo} />
      </div>
      <div className='text-center text-sm'>
        Don&apos;t have an account?{' '}
        <Link href='/signup' className='underline underline-offset-4'>
          Sign up
        </Link>
      </div>
    </div>
  );
}
