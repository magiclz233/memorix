'use client';

import { cn } from '@/lib/utils';

type DotBackgroundProps = {
  className?: string;
};

export function DotBackground({ className }: DotBackgroundProps) {
  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      aria-hidden
    >
      <div className="absolute inset-0 bg-white dark:bg-black" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.06)_1px,transparent_0)] [background-size:22px_22px] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)]" />
      <div className="absolute -left-24 top-[-10rem] h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.16),transparent_70%)] blur-3xl opacity-80 dark:bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.28),transparent_70%)]" />
      <div className="absolute right-[-6rem] top-24 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(14,116,144,0.14),transparent_70%)] blur-3xl opacity-70 dark:bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.22),transparent_70%)]" />
      <div className="absolute bottom-[-12rem] left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(147,197,253,0.16),transparent_70%)] blur-3xl opacity-70 dark:bg-[radial-gradient(circle_at_center,rgba(96,165,250,0.26),transparent_70%)]" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background via-background/60 to-transparent" />
    </div>
  );
}
