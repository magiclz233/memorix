'use client'

import Link from 'next/link'
import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { signup, type SignupState } from '@/app/lib/actions'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<'form'>) {
  const router = useRouter()
  const initialState: SignupState = { message: null, errors: {}, success: false }
  const [state, formAction, isPending] = useActionState<SignupState, FormData>(
    signup,
    initialState
  )
  const toFieldErrors = (errors?: string[]) =>
    errors?.map((message) => ({ message }))

  useEffect(() => {
    if (state.success) {
      router.replace('/login')
    }
  }, [state.success, router])

  return (
    <form
      className={cn('flex flex-col gap-6', className)}
      {...props}
      action={formAction}
    >
      <FieldGroup>
        <div className='flex flex-col items-center gap-1 text-center'>
          <h1 className='text-2xl font-bold'>Create your account</h1>
          <p className='text-muted-foreground text-sm text-balance'>
            Fill in the form below to create your account
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor='name'>Full Name</FieldLabel>
          <Input
            id='name'
            name='name'
            type='text'
            placeholder='John Doe'
            autoComplete='name'
            required
          />
          <FieldError errors={toFieldErrors(state.errors?.name)} />
        </Field>
        <Field>
          <FieldLabel htmlFor='email'>Email</FieldLabel>
          <Input
            id='email'
            name='email'
            type='email'
            placeholder='m@example.com'
            autoComplete='email'
            required
          />
          <FieldDescription>
            We&apos;ll use this to contact you. We will not share your email
            with anyone else.
          </FieldDescription>
          <FieldError errors={toFieldErrors(state.errors?.email)} />
        </Field>
        <Field>
          <FieldLabel htmlFor='password'>Password</FieldLabel>
          <Input
            id='password'
            name='password'
            type='password'
            autoComplete='new-password'
            minLength={6}
            required
          />
          <FieldDescription>
            Must be at least 6 characters long.
          </FieldDescription>
          <FieldError errors={toFieldErrors(state.errors?.password)} />
        </Field>
        <Field>
          <FieldLabel htmlFor='confirm-password'>Confirm Password</FieldLabel>
          <Input
            id='confirm-password'
            name='confirmPassword'
            type='password'
            autoComplete='new-password'
            minLength={6}
            required
          />
          <FieldDescription>Please confirm your password.</FieldDescription>
          <FieldError errors={toFieldErrors(state.errors?.confirmPassword)} />
        </Field>
        <Field>
          <Button type='submit' disabled={isPending} aria-disabled={isPending}>
            Create Account
          </Button>
          {state.message ? (
            <p className='text-sm text-destructive' role='alert'>
              {state.message}
            </p>
          ) : null}
        </Field>
        <FieldSeparator>Or continue with</FieldSeparator>
        <Field>
          <Button variant='outline' type='button'>
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
              <path
                d='M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12'
                fill='currentColor'
              />
            </svg>
            Sign up with GitHub
          </Button>
          <FieldDescription className='px-6 text-center'>
            Already have an account? <Link href='/login'>Sign in</Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
