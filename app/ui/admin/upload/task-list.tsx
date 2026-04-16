'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CheckCircle2 } from 'lucide-react';

import type { UploadTask } from '@/app/lib/definitions';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskCard } from '@/app/ui/admin/upload/task-card';
import { Button } from '@/components/ui/button';
import { setFilesPublished } from '@/app/lib/actions/media';
import { showSuccessToast, showErrorToast, showLoadingToast, updateToast } from '@/app/lib/batch-operations';
import { useRouter } from '@/i18n/navigation';

type TaskListProps = {
  tasks: UploadTask[];
  onPause: (taskId: string) => void;
  onResume: (taskId: string) => void;
  onCancel: (taskId: string) => void;
  onRetry: (taskId: string) => void;
  onView: (taskId: string) => void;
};

export function TaskList({
  tasks,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onView,
}: TaskListProps) {
  const t = useTranslations('dashboard.upload');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<'all' | 'uploading' | 'completed'>('all');
  const [, startTransition] = useTransition();
  const router = useRouter();

  const filteredTasks = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchName = normalized
        ? task.name.toLowerCase().includes(normalized)
        : true;
      const matchStatus =
        status === 'all'
          ? true
          : status === 'uploading'
            ? task.status === 'uploading' || task.status === 'queued' || task.status === 'paused'
            : task.status === 'completed';

      return matchName && matchStatus;
    });
  }, [keyword, status, tasks]);

  // 获取所有已完成任务的文件 ID
  const completedFileIds = useMemo(() => {
    return tasks
      .filter((task) => task.status === 'completed')
      .flatMap((task) => task.files.map((file) => file.id))
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));
  }, [tasks]);

  const handlePublishAll = () => {
    if (completedFileIds.length === 0) {
      showErrorToast(t('messages.noCompletedFiles'));
      return;
    }

    const toastId = showLoadingToast(t('messages.publishing'));

    startTransition(async () => {
      try {
        const result = await setFilesPublished(completedFileIds, true);
        
        if (result.message) {
          updateToast(toastId, 'success', result.message);
        } else {
          updateToast(toastId, 'success', t('messages.publishSuccess'));
        }
        
        router.refresh();
      } catch (error) {
        console.error('Publish error:', error);
        updateToast(toastId, 'error', t('messages.publishFailed'));
      }
    });
  };

  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredTasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 3,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder={t('taskDetail.searchPlaceholder')}
          className="h-10 max-w-lg border-zinc-200 bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/70"
        />

        <div className="flex items-center gap-3">
          <Tabs
            value={status}
            onValueChange={(value) =>
              setStatus(value as 'all' | 'uploading' | 'completed')
            }
          >
            <TabsList className="grid w-full grid-cols-3 lg:w-[320px]">
              <TabsTrigger value="all">{t('taskDetail.filterAll')}</TabsTrigger>
              <TabsTrigger value="uploading">
                {t('taskDetail.filterUploading')}
              </TabsTrigger>
              <TabsTrigger value="completed">
                {t('status.completed')}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {completedFileIds.length > 0 && (
            <Button
              onClick={handlePublishAll}
              variant="default"
              className="gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              {t('publishAll')}
            </Button>
          )}
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
          {t('queue.empty')}
        </div>
      ) : (
        <div
          ref={parentRef}
          className="max-h-[640px] overflow-auto rounded-xl border border-zinc-200 bg-white/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/50"
        >
          <div
            className="relative w-full"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {virtualRows.map((virtualRow) => {
              const task = filteredTasks[virtualRow.index];

              return (
                <div
                  key={task.id}
                  className="absolute left-0 top-0 w-full px-1 pb-3"
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <TaskCard
                    task={task}
                    onPause={onPause}
                    onResume={onResume}
                    onCancel={onCancel}
                    onRetry={onRetry}
                    onView={onView}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

