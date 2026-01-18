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
  const safeRedirectTo =
    trimmedRedirectTo.startsWith('/') ? trimmedRedirectTo : '/gallery';
  const signupHref = `/signup?callbackUrl=${encodeURIComponent(safeRedirectTo)}`;

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <div className='flex flex-col items-center gap-2 text-center'>
        <h1 className='text-2xl font-bold'>登录你的账号</h1>
        <p className='text-balance text-sm text-muted-foreground'>
          请输入邮箱和密码以继续
        </p>
      </div>
      <div className='grid gap-6'>
        <LoginFormFields redirectTo={safeRedirectTo} />
        <div className='relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border'>
          <span className='relative z-10 bg-background px-2 text-muted-foreground'>
            或使用以下方式登录
          </span>
        </div>
        <GitHubSignInButton redirectTo={safeRedirectTo} />
      </div>
      <div className='text-center text-sm'>
        还没有账号？{' '}
        <Link href={signupHref} className='underline underline-offset-4'>
          去注册
        </Link>
      </div>
    </div>
  );
}
