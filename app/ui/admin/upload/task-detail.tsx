'use client';

import { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useVirtualizer } from '@tanstack/react-virtual';

import { FileItem } from '@/app/ui/admin/upload/file-item';
import { useUploadTasks } from '@/app/ui/hooks/use-upload-tasks';
import { formatBytes } from '@/app/lib/upload-task-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type TaskDetailProps = {
  taskId: string;
};

export function TaskDetail({ taskId }: TaskDetailProps) {
  const t = useTranslations('dashboard.upload');
  const {
    tasks,
    pauseTask,
    resumeTask,
    cancelTask,
    retryTask,
    pauseFile,
    resumeFile,
    cancelFile,
    retryFile,
  } = useUploadTasks();

  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<'all' | 'uploading' | 'failed'>('all');

  const task = useMemo(
    () => tasks.find((item) => item.id === taskId) ?? null,
    [taskId, tasks],
  );

  const filteredFiles = useMemo(() => {
    if (!task) {
      return [];
    }

    const normalized = keyword.trim().toLowerCase();

    return task.files.filter((file) => {
      const matchedKeyword = normalized
        ? file.fileName.toLowerCase().includes(normalized)
        : true;

      const matchedStatus =
        status === 'all'
          ? true
          : status === 'uploading'
            ? file.status === 'uploading' || file.status === 'waiting' || file.status === 'paused'
            : file.status === 'error';

      return matchedKeyword && matchedStatus;
    });
  }, [keyword, status, task]);

  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredFiles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88,
    overscan: 5,
  });

  if (!task) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
        {t('messages.uploadFailed')}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/90 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{task.name}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t('taskDetail.info', {
                files: task.metadata.totalFiles,
                size: formatBytes(task.metadata.totalSize),
                storage: task.storageLabel,
              })}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {task.status === 'uploading' ? (
              <Button type="button" variant="outline" onClick={() => pauseTask(task.id)}>
                {t('actions.pauseAll')}
              </Button>
            ) : null}

            {(task.status === 'queued' || task.status === 'paused') ? (
              <Button type="button" variant="outline" onClick={() => resumeTask(task.id)}>
                {t('actions.resumeAll')}
              </Button>
            ) : null}

            {task.status === 'failed' ? (
              <Button type="button" variant="outline" onClick={() => retryTask(task.id)}>
                {t('actions.retryFailed')}
              </Button>
            ) : null}

            {task.status !== 'completed' ? (
              <Button
                type="button"
                variant="ghost"
                className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                onClick={() => cancelTask(task.id)}
              >
                {t('actions.cancelTask')}
              </Button>
            ) : null}
          </div>
        </div>

        <Progress
          value={task.metadata.progress}
          className="h-2 [&>div]:bg-indigo-500"
        />
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white/90 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={t('taskDetail.searchPlaceholder')}
            className="h-10 max-w-lg"
          />

          <Tabs
            value={status}
            onValueChange={(value) =>
              setStatus(value as 'all' | 'uploading' | 'failed')
            }
          >
            <TabsList className="grid w-full grid-cols-3 lg:w-[320px]">
              <TabsTrigger value="all">{t('taskDetail.filterAll')}</TabsTrigger>
              <TabsTrigger value="uploading">
                {t('taskDetail.filterUploading')}
              </TabsTrigger>
              <TabsTrigger value="failed">{t('taskDetail.filterFailed')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {filteredFiles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
            {t('queue.empty')}
          </div>
        ) : (
          <div
            ref={parentRef}
            className="max-h-[640px] overflow-auto rounded-lg border border-zinc-200 bg-white/60 p-2 dark:border-zinc-800 dark:bg-zinc-900/40"
          >
            <div
              className="relative w-full"
              style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const file = filteredFiles[virtualRow.index];

                return (
                  <div
                    key={file.id}
                    className="absolute left-0 top-0 w-full p-1"
                    style={{ transform: `translateY(${virtualRow.start}px)` }}
                  >
                    <FileItem
                      file={file}
                      onPause={(fileId) => pauseFile(task.id, fileId)}
                      onResume={(fileId) => resumeFile(task.id, fileId)}
                      onCancel={(fileId) => cancelFile(task.id, fileId)}
                      onRetry={(fileId) => retryFile(task.id, fileId)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="button" variant="outline">
            {t('actions.manageFiles')}
          </Button>
        </div>
      </section>
    </div>
  );
}