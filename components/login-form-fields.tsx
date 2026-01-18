'use client';

import { useActionState, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { authenticate } from '@/app/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type LoginFormFieldsProps = {
  className?: string;
  redirectTo?: string;
};

export function LoginFormFields({
  className,
  redirectTo,
}: LoginFormFieldsProps) {
  const trimmedRedirectTo =
    typeof redirectTo === 'string' ? redirectTo.trim() : '';
  const safeRedirectTo = trimmedRedirectTo.startsWith('/')
    ? trimmedRedirectTo
    : '/gallery';
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className={cn('grid gap-4', className)}>
      <div className='grid gap-2'>
        <Label htmlFor='email'>邮箱</Label>
        <Input
          id='email'
          name='email'
          type='email'
          placeholder='name@example.com'
          autoComplete='email'
          required
        />
      </div>
      <div className='grid gap-2'>
        <div className='flex items-center'>
          <Label htmlFor='password'>密码</Label>
          <a
            href='#'
            className='ml-auto text-sm underline-offset-2 hover:underline'
          >
            忘记密码？
          </a>
        </div>
        <div className='relative'>
          <Input
            id='password'
            name='password'
            type={showPassword ? 'text' : 'password'}
            autoComplete='current-password'
            required
            minLength={6}
            className='pr-16'
          />
          <button
            type='button'
            className='absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground'
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? '隐藏密码' : '显示密码'}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
            <span className='sr-only'>
              {showPassword ? '隐藏密码' : '显示密码'}
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
        登录
      </Button>
      {errorMessage ? (
        <p className='text-sm text-red-500' role='alert'>
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
