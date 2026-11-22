'use client';

import { Link, useRouter } from '@/i18n/navigation';
import { useActionState, useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { signup, type SignupState } from '@/app/lib/actions';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { GitHubSignInButton } from '@/components/github-signin-button';

type SignupFormProps = React.ComponentProps<'form'> & {
  githubEnabled?: boolean;
  minPasswordLength: number;
};

export function SignupForm({
  className,
  githubEnabled = false,
  minPasswordLength,
  ...props
}: SignupFormProps) {
  const t = useTranslations('auth.signup');
  const router = useRouter();
  const initialState: SignupState = { message: null, errors: {}, success: false };
  const [state, formAction, isPending] = useActionState<SignupState, FormData>(
    signup,
    initialState,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const toFieldErrors = (errors?: string[]) =>
    errors?.map((message) => ({ message }));

  useEffect(() => {
    if (state.success) {
      router.replace('/login');
    }
  }, [state.success, router]);

  return (
    <form
      className={cn('flex flex-col gap-6', className)}
      {...props}
      action={formAction}
    >
      <FieldGroup>
        <div className='flex flex-col items-center gap-1 text-center'>
          <h1 className='text-2xl font-bold'>{t('title')}</h1>
          <p className='text-muted-foreground text-sm text-balance'>
            {t('subtitle')}
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor='name'>{t('nameLabel')}</FieldLabel>
          <Input
            id='name'
            name='name'
            type='text'
            placeholder={t('namePlaceholder')}
            autoComplete='name'
            required
          />
          <FieldError errors={toFieldErrors(state.errors?.name)} />
        </Field>
        <Field>
          <FieldLabel htmlFor='email'>{t('emailLabel')}</FieldLabel>
          <Input
            id='email'
            name='email'
            type='email'
            placeholder={t('emailPlaceholder')}
            autoComplete='email'
            required
          />
          <FieldDescription>{t('emailDescription')}</FieldDescription>
          <FieldError errors={toFieldErrors(state.errors?.email)} />
        </Field>
        <Field>
          <FieldLabel htmlFor='password'>{t('passwordLabel')}</FieldLabel>
          <div className='relative'>
            <Input
              id='password'
              name='password'
              type={showPassword ? 'text' : 'password'}
              autoComplete='new-password'
              minLength={minPasswordLength}
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
          <FieldDescription>
            {t('passwordHint', { min: minPasswordLength })}
          </FieldDescription>
          <FieldError errors={toFieldErrors(state.errors?.password)} />
        </Field>
        <Field>
          <FieldLabel htmlFor='confirm-password'>
            {t('confirmPasswordLabel')}
          </FieldLabel>
          <div className='relative'>
            <Input
              id='confirm-password'
              name='confirmPassword'
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete='new-password'
              minLength={minPasswordLength}
              required
              className='pr-16'
            />
            <button
              type='button'
              className='absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground'
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={
                showConfirmPassword ? t('hideConfirmPassword') : t('showConfirmPassword')
              }
              aria-pressed={showConfirmPassword}
            >
              {showConfirmPassword ? (
                <EyeOff className='h-4 w-4' />
              ) : (
                <Eye className='h-4 w-4' />
              )}
              <span className='sr-only'>
                {showConfirmPassword ? t('hideConfirmPassword') : t('showConfirmPassword')}
              </span>
            </button>
          </div>
          <FieldDescription>{t('confirmPasswordHint')}</FieldDescription>
          <FieldError errors={toFieldErrors(state.errors?.confirmPassword)} />
        </Field>
        <Field>
          <Button type='submit' disabled={isPending} aria-disabled={isPending}>
            {t('submit')}
          </Button>
          {state.message ? (
            <p className='text-sm text-destructive' role='alert'>
              {state.message}
            </p>
          ) : null}
        </Field>
        {githubEnabled ? (
          <>
            <FieldSeparator>{t('divider')}</FieldSeparator>
            <Field>
              <GitHubSignInButton label={t('githubSignUp')} />
            </Field>
          </>
        ) : null}
        <Field>
          <FieldDescription className='px-6 text-center'>
            {t('hasAccount')}{' '}
            <Link href='/login' className='underline underline-offset-4'>
              {t('loginLink')}
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
