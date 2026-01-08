import type { ReactNode } from 'react';
import { FrontBackground } from '@/app/ui/front/front-background';
import { FrontFooter } from '@/app/ui/front/front-footer';
import { FrontNav } from '@/app/ui/front/front-nav';

type FrontShellProps = {
  children: ReactNode;
};

export function FrontShell({ children }: FrontShellProps) {
  return (
    <div className='relative min-h-screen overflow-hidden bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100'>
      <FrontBackground />
      <div className='relative z-10 flex min-h-screen flex-col'>
        <FrontNav />
        <main className='flex-1'>
          <div className='mx-auto w-full max-w-6xl px-6 py-16'>
            {children}
          </div>
        </main>
        <FrontFooter />
      </div>
    </div>
  );
}
