'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type SpotlightCardProps = {
  className?: string;
  children: React.ReactNode;
};

type SpotlightState = {
  x: number;
  y: number;
};

const INITIAL_SPOTLIGHT: SpotlightState = { x: 0, y: 0 };

export function SpotlightCard({ className, children }: SpotlightCardProps) {
  const [spotlight, setSpotlight] = useState<SpotlightState>(INITIAL_SPOTLIGHT);
  const [active, setActive] = useState(false);

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setSpotlight({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  return (
    <div
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onMouseMove={handleMove}
      className={cn(
        'relative overflow-hidden rounded-3xl border border-zinc-200 bg-white/80 shadow-black/5 shadow-sm transition-shadow hover:shadow-xl dark:border-white/10 dark:bg-zinc-900/50',
        className
      )}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 [background:radial-gradient(240px_circle_at_var(--spotlight-x)_var(--spotlight-y),rgba(0,0,0,0.05),transparent_70%)] dark:[background:radial-gradient(240px_circle_at_var(--spotlight-x)_var(--spotlight-y),rgba(255,255,255,0.1),transparent_70%)]"
        style={
          {
            '--spotlight-x': `${spotlight.x}px`,
            '--spotlight-y': `${spotlight.y}px`,
            opacity: active ? 1 : 0,
          } as React.CSSProperties
        }
      />
      <div className='relative z-10 h-full w-full'>{children}</div>
    </div>
  );
}
