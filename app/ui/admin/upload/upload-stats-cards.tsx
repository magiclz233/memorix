'use client';

import { useMemo } from 'react';
import { Activity, CircleCheckBig, Clock3, Gauge } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { UploadTask } from '@/app/lib/definitions';
import { formatSpeed } from '@/app/lib/upload-task-utils';

type UploadStatsCardsProps = {
  tasks: UploadTask[];
};

export function UploadStatsCards({ tasks }: UploadStatsCardsProps) {
  const t = useTranslations('dashboard.upload');

  const stats = useMemo(() => {
    const uploading = tasks.filter((task) => task.status === 'uploading').length;
    const queued = tasks.filter((task) => task.status === 'queued').length;
    const speed = tasks.reduce((sum, task) => sum + task.metadata.speed, 0);
    const completed = tasks.reduce(
      (sum, task) => sum + task.files.filter((file) => file.status === 'done').length,
      0,
    );

    return {
      uploading,
      queued,
      speed,
      completed,
    };
  }, [tasks]);

  const cards = [
    {
      key: 'uploading',
      title: t('stats.uploading'),
      value: String(stats.uploading).padStart(2, '0'),
      suffix: t('queue.status.items', { count: '' }).trim(), // Extract something similar, or just hardcode unit
      valueColor: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      key: 'queued',
      title: t('stats.queued'),
      value: String(stats.queued),
      suffix: t('queue.status.items', { count: '' }).trim(),
      valueColor: 'text-zinc-900 dark:text-zinc-100',
    },
    {
      key: 'speed',
      title: t('stats.speed'),
      value: formatSpeed(stats.speed).replace(/ (B\/s|KB\/s|MB\/s|GB\/s)/, ''), // Just the number
      suffix: formatSpeed(stats.speed).replace(/[\d.\s]/g, ''), // Just the unit
      valueColor: 'text-amber-600 dark:text-amber-500',
    },
    {
      key: 'completed',
      title: t('stats.completed'),
      value: new Intl.NumberFormat().format(stats.completed), // To show comma for huge numbers like 1,248
      suffix: t('queue.fileHead'),
      valueColor: 'text-zinc-900 dark:text-zinc-100',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        return (
          <div
            key={card.key}
            className="flex flex-col justify-between rounded-2xl bg-white p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] dark:bg-zinc-900/50"
          >
            <span className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400">
              {card.title}
            </span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className={cn('font-mono text-4xl font-bold tracking-tight', card.valueColor)}>
                {card.value}
              </span>
              <span className="text-sm font-medium text-zinc-400 dark:text-zinc-500">
                {card.suffix || '项'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}