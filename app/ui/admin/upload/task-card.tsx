'use client';

import { Pause, Play, RotateCcw, Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { UploadTask } from '@/app/lib/definitions';
import {
  formatBytes,
  formatDuration,
} from '@/app/lib/upload-task-utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

type TaskCardProps = {
  task: UploadTask;
  onPause: (taskId: string) => void;
  onResume: (taskId: string) => void;
  onCancel: (taskId: string) => void;
  onRetry: (taskId: string) => void;
  onView: (taskId: string) => void;
};

function statusClasses(status: UploadTask['status']) {
  switch (status) {
    case 'uploading':
      return 'bg-indigo-500/10 text-indigo-700 border-indigo-200 dark:text-indigo-300 dark:border-indigo-500/30';
    case 'queued':
      return 'bg-zinc-500/10 text-zinc-700 border-zinc-200 dark:text-zinc-300 dark:border-zinc-500/30';
    case 'completed':
      return 'bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-300 dark:border-emerald-500/30';
    case 'paused':
      return 'bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-300 dark:border-amber-500/30';
    default:
      return 'bg-rose-500/10 text-rose-700 border-rose-200 dark:text-rose-300 dark:border-rose-500/30';
  }
}

export function TaskCard({
  task,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onView,
}: TaskCardProps) {
  const t = useTranslations('dashboard.upload');

  return (
    <Card className="border-zinc-200/80 bg-white/90 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/70">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="line-clamp-1 text-base text-zinc-900 dark:text-zinc-100">
            {task.name}
          </CardTitle>
          <Badge
            variant="outline"
            className={statusClasses(task.status)}
          >
            {t(`status.${task.status}`)}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <span>{t('taskCard.files', { count: task.metadata.totalFiles })}</span>
          <span>{t('taskCard.size', { size: formatBytes(task.metadata.totalSize) })}</span>
          <span>
            {t('taskCard.remaining', {
              time: formatDuration(task.metadata.remainingTime),
            })}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Progress
            value={task.metadata.progress}
            className="h-2 [&>div]:bg-indigo-500"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t('taskCard.progress', {
              percent: task.metadata.progress,
              uploaded: formatBytes(task.metadata.uploadedSize),
              total: formatBytes(task.metadata.totalSize),
            })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {task.status === 'uploading' ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPause(task.id)}
              className="gap-1.5"
            >
              <Pause className="h-3.5 w-3.5" />
              {t('actions.pause')}
            </Button>
          ) : null}

          {(task.status === 'paused' || task.status === 'queued') ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onResume(task.id)}
              className="gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              {t('actions.resume')}
            </Button>
          ) : null}

          {task.status === 'failed' ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRetry(task.id)}
              className="gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t('actions.retry')}
            </Button>
          ) : null}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => onView(task.id)}
            className="gap-1.5"
          >
            <Search className="h-3.5 w-3.5" />
            {t('actions.viewDetails')}
          </Button>

          {task.status !== 'completed' ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onCancel(task.id)}
              className="gap-1.5 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
            >
              <X className="h-3.5 w-3.5" />
              {t('actions.cancel')}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}