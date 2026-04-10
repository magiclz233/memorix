'use client';

import { Pause, Play, RotateCcw, Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { UploadTask } from '@/app/lib/definitions';
import {
  formatBytes,
  formatDuration,
  formatSpeed,
} from '@/app/lib/upload-task-utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] dark:bg-zinc-900/50 transition-all border-l-4",
        task.status === 'uploading' ? 'border-l-indigo-600' :
        task.status === 'completed' ? 'border-l-emerald-500' :
        task.status === 'failed' ? 'border-l-rose-500' :
        'border-l-zinc-300 dark:border-l-zinc-700'
      )}
    >
      <div className="flex flex-col gap-4 p-5 pb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6 text-zinc-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {task.name}
            </h3>
            <div className="mt-1 flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <span>{task.metadata.totalFiles} 项</span>
              <span>·</span>
              <span>{formatDuration(task.metadata.remainingTime)}</span>
              <Badge variant="secondary" className={cn("ml-2 font-semibold", statusClasses(task.status))}>
                {t(`status.${task.status}`)}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onView(task.id)}
              className="h-8 rounded-full font-bold text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
            >
              {task.status === 'uploading' ? '查看详情' : task.status === 'completed' ? '查看文件' : '继续任务'}
            </Button>
            
            {task.status === 'uploading' ? (
              <Button size="icon" variant="ghost" onClick={() => onPause(task.id)} className="h-8 w-8 rounded-full text-zinc-400">
                <Pause className="h-4 w-4" />
              </Button>
            ) : task.status === 'paused' || task.status === 'queued' ? (
              <Button size="icon" variant="ghost" onClick={() => onResume(task.id)} className="h-8 w-8 rounded-full text-zinc-400">
                <Play className="h-4 w-4" />
              </Button>
            ) : null}
            
            {task.status !== 'completed' && (
               <Button size="icon" variant="ghost" onClick={() => onCancel(task.id)} className="h-8 w-8 rounded-full text-rose-400 hover:text-rose-600 hover:bg-rose-50">
                  <X className="h-4 w-4" />
               </Button>
            )}
          </div>
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {formatBytes(task.metadata.uploadedSize)} / {formatBytes(task.metadata.totalSize)} · {formatSpeed(task.metadata.speed)}
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-1.5 w-full bg-zinc-100 dark:bg-zinc-800">
        <div 
          className={cn(
            "h-full transition-all duration-300",
            task.status === 'uploading' ? 'bg-indigo-600' :
            task.status === 'completed' ? 'bg-emerald-500' :
            task.status === 'failed' ? 'bg-rose-500' :
            'bg-zinc-300 dark:bg-zinc-600'
          )}
          style={{ width: `${task.metadata.progress}%` }}
        />
      </div>
    </div>
  );
}