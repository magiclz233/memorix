import Link from 'next/link';
import { GalleryVerticalEnd } from 'lucide-react';

import { LoginForm } from '@/components/login-form';

type LoginPageProps = {
  searchParams?: {
    callbackUrl?: string | string[];
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const rawCallbackUrl = searchParams?.callbackUrl;
  const callbackUrl =
    typeof rawCallbackUrl === 'string' && rawCallbackUrl.trim().length > 0
      ? rawCallbackUrl.trim()
      : Array.isArray(rawCallbackUrl) &&
          rawCallbackUrl[0] &&
          rawCallbackUrl[0].trim().length > 0
        ? rawCallbackUrl[0].trim()
        : '/gallery';

  return (
    <div className='grid min-h-svh lg:grid-cols-2'>
      <div className='bg-muted relative hidden lg:block'>
        <img
          src='/placeholder.svg'
          alt='Image'
          className='absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale'
        />
      </div>
      <div className='flex flex-col gap-4 p-6 md:p-10'>
        <div className='flex justify-center gap-2 md:justify-start'>
          <Link href='/' className='flex items-center gap-2 font-medium'>
            <div className='bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md'>
              <GalleryVerticalEnd className='size-4' />
            </div>
            Acme Inc.
          </Link>
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
