'use client';

import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

type StatusType = 'online' | 'scanning' | 'error' | 'disabled' | 'offline';

interface StatusIndicatorProps {
  status: StatusType;
  showLabel?: boolean;
  className?: string;
  isScanning?: boolean;
}

const STATUS_CONFIG = {
  online: {
    color: 'bg-emerald-500',
    labelKey: 'dashboard.status.online',
    glow: 'shadow-[0_0_8px_rgba(16,185,129,0.5)]',
  },
  scanning: {
    color: 'bg-indigo-500',
    labelKey: 'dashboard.status.scanning',
    glow: 'shadow-[0_0_12px_rgba(99,102,241,0.6)]',
    animate: 'animate-pulse scale-110',
  },
  error: {
    color: 'bg-rose-500',
    labelKey: 'dashboard.status.error',
    glow: 'shadow-[0_0_8px_rgba(244,63,94,0.5)]',
  },
  disabled: {
    color: 'bg-zinc-400',
    labelKey: 'dashboard.status.disabled',
    glow: '',
  },
  offline: {
    color: 'bg-zinc-300',
    labelKey: 'dashboard.status.offline',
    glow: '',
  },
};

export function StatusIndicator({
  status,
  showLabel = false,
  className,
  isScanning = false,
}: StatusIndicatorProps) {
  const t = useTranslations();
  const effectiveStatus = isScanning ? 'scanning' : status;
  const config = (STATUS_CONFIG as any)[effectiveStatus] || STATUS_CONFIG.offline;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative flex h-2 w-2">
        {effectiveStatus === 'scanning' && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
        )}
        <div
          className={cn(
            'relative h-2 w-2 rounded-full transition-all duration-500',
            config.color,
            config.glow,
            (config as any).animate
          )}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {t(config.labelKey)}
        </span>
      )}
    </div>
  );
}
