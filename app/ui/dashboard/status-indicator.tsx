import { cn } from '@/lib/utils';
import { Wifi, Loader2, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';

interface StatusIndicatorProps {
  status: 'online' | 'scanning' | 'error' | 'disabled' | 'offline';
  className?: string;
  showLabel?: boolean;
}

export function StatusIndicator({ status, className, showLabel = true }: StatusIndicatorProps) {
  const t = useTranslations('dashboard.status');
  const config = {
    online: {
      color: 'bg-emerald-500',
      badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30',
      label: t('online'),
      animate: 'animate-pulse',
    },
    scanning: {
      color: 'bg-blue-500',
      badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30',
      label: t('scanning'),
      animate: 'animate-spin',
    },
    error: {
      color: 'bg-red-500',
      badgeClass: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30',
      label: t('error'),
      animate: '',
    },
    disabled: {
      color: 'bg-zinc-400',
      badgeClass: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700',
      label: t('disabled'),
      animate: '',
    },
    offline: {
      color: 'bg-zinc-400',
      badgeClass: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700',
      label: t('offline'),
      animate: '',
    },
  };

  const { color, badgeClass, label, animate } = config[status] || config.offline;

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-2 pl-2 pr-2.5 py-1 font-medium transition-colors',
        badgeClass,
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
    </Badge>
  );
}
