'use client';

import {
  AlertCircle,
  CheckCircle2,
  Pause,
  Play,
  RotateCcw,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { UploadFile } from '@/app/lib/definitions';
import {
  formatBytes,
  formatDuration,
  formatSpeed,
} from '@/app/lib/upload-task-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

type FileItemProps = {
  file: UploadFile;
  onPause: (fileId: string) => void;
  onResume: (fileId: string) => void;
  onCancel: (fileId: string) => void;
  onRetry: (fileId: string) => void;
};

function phaseLabel(file: UploadFile, t: ReturnType<typeof useTranslations>) {
  if (file.status === 'done') {
    return t('status.completed');
  }

  if (file.status === 'error') {
    return t('status.failed');
  }

  if (file.status === 'paused') {
    return t('status.paused');
  }

  if (file.status === 'waiting') {
    return t('fileItem.waiting');
  }

  return t(`phase.${file.phase}`);
}

export function FileItem({ file, onPause, onResume, onCancel, onRetry }: FileItemProps) {
  const t = useTranslations('dashboard.upload');

  return (
    <Card className="border-zinc-200/80 bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/60">
      <CardContent className="space-y-3 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {file.fileName}
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>{formatBytes(file.totalSize)}</span>
              <span>{phaseLabel(file, t)}</span>
              <span>
                {file.speed > 0 ? t('fileItem.speed', { speed: formatSpeed(file.speed) }) : '--'}
              </span>
              <span>
                {t('fileItem.remaining', {
                  time: formatDuration(
                    file.speed > 0
                      ? Math.ceil(Math.max(file.totalSize - file.uploadedSize, 0) / file.speed)
                      : null,
                  ),
                })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {file.status === 'uploading' ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => onPause(file.id)}
                aria-label={t('actions.pause')}
              >
                <Pause className="h-4 w-4" />
              </Button>
            ) : null}

            {(file.status === 'paused' || file.status === 'waiting') ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => onResume(file.id)}
                aria-label={t('actions.resume')}
              >
                <Play className="h-4 w-4" />
              </Button>
            ) : null}

            {file.status === 'error' ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => onRetry(file.id)}
                aria-label={t('actions.retry')}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            ) : null}

            {file.status !== 'done' ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                onClick={() => onCancel(file.id)}
                aria-label={t('actions.cancel')}
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>

        <Progress
          value={file.progress}
          className="h-1 [&>div]:bg-indigo-500"
        />

        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>{file.progress}%</span>

          {file.status === 'done' ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t('fileItem.completed')}
            </span>
          ) : null}

          {file.status === 'error' && file.error ? (
            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-3.5 w-3.5" />
              {t('fileItem.error', { message: file.error })}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}