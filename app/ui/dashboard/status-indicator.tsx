import { cn } from '@/lib/utils';
import { Wifi, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface StatusIndicatorProps {
  status: 'online' | 'scanning' | 'error' | 'disabled' | 'offline';
  className?: string;
  showLabel?: boolean;
}

export function StatusIndicator({ status, className, showLabel = true }: StatusIndicatorProps) {
  const t = useTranslations('dashboard.status');
  const config = {
    online: {
      icon: Wifi,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-700 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      label: t('online'),
      animate: 'animate-pulse',
    },
    scanning: {
      icon: Loader2,
      color: 'bg-blue-500',
      textColor: 'text-blue-700 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      label: t('scanning'),
      animate: 'animate-spin',
    },
    error: {
      icon: AlertCircle,
      color: 'bg-red-500',
      textColor: 'text-red-700 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      label: t('error'),
      animate: '',
    },
    disabled: {
      icon: Wifi,
      color: 'bg-zinc-400',
      textColor: 'text-zinc-600 dark:text-zinc-400',
      bgColor: 'bg-zinc-100 dark:bg-zinc-800',
      label: t('disabled'),
      animate: '',
    },
    offline: {
      icon: Wifi,
      color: 'bg-zinc-400',
      textColor: 'text-zinc-600 dark:text-zinc-400',
      bgColor: 'bg-zinc-100 dark:bg-zinc-800',
      label: t('offline'),
      animate: '',
    },
  };

  const { icon: Icon, color, textColor, bgColor, label, animate } = config[status] || config.offline;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
        bgColor,
        textColor,
        className
      )}
    >
      <div className="relative flex h-2 w-2 items-center justify-center">
        {status === 'online' && (
           <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${color} ${animate}`} />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
      </div>
      {showLabel && <span>{label}</span>}
    </div>
  );
}
