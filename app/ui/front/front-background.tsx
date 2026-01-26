'use client';

import { AuroraBackground } from '@/components/ui/aurora-background';

export function FrontBackground() {
  return (
    <div
      className='pointer-events-none absolute inset-0 overflow-hidden'
      aria-hidden
    >
      <AuroraBackground className='h-full w-full !fixed inset-0 z-0' />
    </div>
  );
}
