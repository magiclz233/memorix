'use client';

import { useMemo } from 'react';
import { Activity, CircleCheckBig, Clock3, Gauge } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { UploadTask } from '@/app/lib/definitions';
import { formatSpeed } from '@/app/lib/upload-task-utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

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
      value: String(stats.uploading),
      description: t('status.uploading'),
      icon: Activity,
    },
    {
      key: 'queued',
      title: t('stats.queued'),
      value: String(stats.queued),
      description: t('status.queued'),
      icon: Clock3,
    },
    {
      key: 'speed',
      title: t('stats.speed'),
      value: formatSpeed(stats.speed),
      description: t('stats.speed'),
      icon: Gauge,
    },
    {
      key: 'completed',
      title: t('stats.completed'),
      value: String(stats.completed),
      description: t('status.completed'),
      icon: CircleCheckBig,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card
            key={card.key}
            className="border-zinc-200/80 bg-white/90 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                {card.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                {card.value}
              </div>
              <CardDescription className="pt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {card.description}
              </CardDescription>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}