import type { ReactNode } from 'react';
import { FrontBackground } from '@/app/ui/front/front-background';
import { FrontFooter } from '@/app/ui/front/front-footer';
import { FloatingNav } from '@/app/ui/front/floating-nav';

type FrontShellProps = {
  children: ReactNode;
};

export function FrontShell({ children }: FrontShellProps) {
  return (
    <div className='relative min-h-screen overflow-hidden bg-zinc-50 text-zinc-900 dark:bg-black dark:text-white'>
      <FrontBackground />
      <div className='relative z-10 flex min-h-screen flex-col'>
        <FloatingNav />
        <main className='flex-1'>
          <div className='mx-auto w-[88vw] max-w-none px-0 pb-16 pt-24'>
            {children}
          </div>
        </main>
        <FrontFooter />
      </div>
    </div>
  );
}
