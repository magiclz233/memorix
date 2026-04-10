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

import { cn } from '@/lib/utils';

export function FileItem({ file, onPause, onResume, onCancel, onRetry }: FileItemProps) {
  const t = useTranslations('dashboard.upload');

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl bg-white p-3 pb-5 shadow-sm transition-all dark:bg-zinc-900/50 border-l-[3px]",
      file.status === 'uploading' ? 'border-l-indigo-600' :
      file.status === 'done' ? 'border-l-emerald-500' :
      file.status === 'error' ? 'border-l-rose-500' :
      'border-l-zinc-300 dark:border-l-zinc-700'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {file.fileName}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>{formatBytes(file.totalSize)}</span>
            <span>·</span>
            <span className={cn(
              file.status === 'done' ? 'text-emerald-600 dark:text-emerald-400' :
              file.status === 'error' ? 'text-rose-600 dark:text-rose-400' :
              file.status === 'uploading' ? 'text-indigo-600 dark:text-indigo-400' : ''
            )}>
              {phaseLabel(file, t)}
            </span>
            {file.status === 'uploading' && (
              <>
                <span>·</span>
                <span>{file.speed > 0 ? formatSpeed(file.speed) : '--'}</span>
                <span>·</span>
                <span>{formatDuration(file.speed > 0 ? Math.ceil(Math.max(file.totalSize - file.uploadedSize, 0) / file.speed) : null)}</span>
              </>
            )}
            {file.status === 'error' && file.error && (
              <span className="ml-1 flex items-center gap-1 text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-3 w-3" />
                {file.error}
              </span>
            )}
            {file.status === 'done' && (
              <span className="ml-1 flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {file.status === 'uploading' ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => onPause(file.id)}
            >
              <Pause className="h-3.5 w-3.5" />
            </Button>
          ) : null}

          {(file.status === 'paused' || file.status === 'waiting') ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => onResume(file.id)}
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
          ) : null}

          {file.status === 'error' ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => onRetry(file.id)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          ) : null}

          {file.status !== 'done' ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-full text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
              onClick={() => onCancel(file.id)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-1 w-full bg-zinc-100 dark:bg-zinc-800">
        <div 
          className={cn(
            "h-full transition-all duration-300",
            file.status === 'uploading' ? 'bg-indigo-600' :
            file.status === 'done' ? 'bg-emerald-500' :
            file.status === 'error' ? 'bg-rose-500' :
            'bg-zinc-300 dark:bg-zinc-600'
          )}
          style={{ width: `${Math.max(0.5, file.progress)}%` }}
        />
      </div>
    </div>
  );
}