'use client';

import { useActionState, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { authenticate } from '@/app/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resolveSafeRedirectPath } from '@/i18n/paths';
import { cn } from '@/lib/utils';

type LoginFormFieldsProps = {
  className?: string;
  redirectTo?: string;
};

export function LoginFormFields({
  className,
  redirectTo,
}: LoginFormFieldsProps) {
  const t = useTranslations('auth.login');
  const safeRedirectTo = resolveSafeRedirectPath(redirectTo);
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className={cn('grid gap-4', className)}>
      <div className='grid gap-2'>
        <Label htmlFor='email'>{t('emailLabel')}</Label>
        <Input
          id='email'
          name='email'
          type='email'
          placeholder={t('emailPlaceholder')}
          autoComplete='email'
          required
        />
      </div>
      <div className='grid gap-2'>
        <Label htmlFor='password'>{t('passwordLabel')}</Label>
        <div className='relative'>
          <Input
            id='password'
            name='password'
            type={showPassword ? 'text' : 'password'}
            autoComplete='current-password'
            required
            className='pr-16'
          />
          <button
            type='button'
            className='absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground'
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? t('hidePassword') : t('showPassword')}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
            <span className='sr-only'>
              {showPassword ? t('hidePassword') : t('showPassword')}
            </span>
          </button>
        </div>
      </div>
      <input type='hidden' name='redirectTo' value={safeRedirectTo} />
      <Button
        type='submit'
        className='w-full'
        disabled={isPending}
        aria-disabled={isPending}
      >
        {t('submit')}
      </Button>
      {errorMessage ? (
        <p className='text-sm text-red-500' role='alert'>
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
