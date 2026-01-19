import Link from 'next/link';
import { GalleryVerticalEnd } from 'lucide-react';

import { LoginForm } from '@/components/login-form';

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string | string[];
  }>;
};

const resolveRedirect = (value?: string | string[]) => {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value[0]?.trim();
  return '';
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const rawCallbackUrl = resolveRedirect(params?.callbackUrl);
  const callbackUrl =
    rawCallbackUrl && rawCallbackUrl.length > 0 ? rawCallbackUrl : '/gallery';

  return (
    <div className='grid min-h-svh lg:grid-cols-2'>
      <div className='bg-muted relative hidden lg:block'>
        <img
          src='/hero-desktop.png'
          alt='Hero 图片'
          className='absolute inset-0 h-full w-full object-cover'
        />
      </div>
      <div className='flex flex-col gap-4 p-6 md:p-10'>
        <div className='flex justify-center gap-2 md:justify-start'>
          <Link href='/' className='flex items-center gap-2 font-medium'>
            <div className='bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md'>
              <GalleryVerticalEnd className='size-4' />
            </div>
            Memorix 画廊
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
