'use client';

import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';

import { authenticate } from '@/app/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type LoginFormFieldsProps = {
  className?: string;
};

export function LoginFormFields({ className }: LoginFormFieldsProps) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/gallery';
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );

  return (
    <form action={formAction} className={cn('grid gap-4', className)}>
      <div className='grid gap-2'>
        <Label htmlFor='email'>Email</Label>
        <Input
          id='email'
          name='email'
          type='email'
          placeholder='m@example.com'
          autoComplete='email'
          required
        />
      </div>
      <div className='grid gap-2'>
        <div className='flex items-center'>
          <Label htmlFor='password'>Password</Label>
          <a
            href='#'
            className='ml-auto text-sm underline-offset-2 hover:underline'
          >
            Forgot your password?
          </a>
        </div>
        <Input
          id='password'
          name='password'
          type='password'
          autoComplete='current-password'
          required
          minLength={6}
        />
      </div>
      <input type='hidden' name='redirectTo' value={callbackUrl} />
      <Button type='submit' className='w-full' disabled={isPending} aria-disabled={isPending}>
        Login
      </Button>
      {errorMessage ? (
        <p className='text-sm text-red-500' role='alert'>
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
