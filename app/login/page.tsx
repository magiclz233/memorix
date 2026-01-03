import { Suspense } from 'react';

import { LoginForm } from '@/components/login-form';
 
export default function LoginPage() {
  return (
    <main className='flex min-h-screen items-center justify-center px-4 py-10'>
      <Suspense>
        <LoginForm className='w-full max-w-4xl' />
      </Suspense>
    </main>
  );
}
