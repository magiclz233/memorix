'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type SpotlightCardProps = React.HTMLAttributes<HTMLDivElement> & {
  className?: string;
  children: React.ReactNode;
};

type SpotlightState = {
  x: number;
  y: number;
};

const INITIAL_SPOTLIGHT: SpotlightState = { x: 0, y: 0 };

export function SpotlightCard({
  className,
  children,
  onMouseEnter,
  onMouseLeave,
  onMouseMove,
  ...props
}: SpotlightCardProps) {
  const [spotlight, setSpotlight] = useState<SpotlightState>(INITIAL_SPOTLIGHT);
  const [active, setActive] = useState(false);

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setSpotlight({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    onMouseMove?.(event);
  };

  return (
    <div
      onMouseEnter={(e) => {
        setActive(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setActive(false);
        onMouseLeave?.(e);
      }}
      onMouseMove={handleMove}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-zinc-200 bg-white/80 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50',
        className
      )}
      {...props}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 [background:radial-gradient(240px_circle_at_var(--spotlight-x)_var(--spotlight-y),rgba(120,120,120,0.16),transparent_70%)] dark:[background:radial-gradient(240px_circle_at_var(--spotlight-x)_var(--spotlight-y),rgba(129,140,248,0.32),transparent_70%)]"
        style={
          {
            '--spotlight-x': `${spotlight.x}px`,
            '--spotlight-y': `${spotlight.y}px`,
            opacity: active ? 1 : 0,
          } as React.CSSProperties
        }
      />
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}
