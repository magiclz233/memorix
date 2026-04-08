'use client';

import { Plus } from 'lucide-react';
import { useCallback } from 'react';
import { useTranslations } from 'next-intl';

import type { UploadStorageOption } from '@/app/lib/definitions';
import { showInfo, showWarning } from '@/app/lib/toast-utils';
import { TaskList } from '@/app/ui/admin/upload/task-list';
import { UploadStatsCards } from '@/app/ui/admin/upload/upload-stats-cards';
import { useNetworkStatus } from '@/app/ui/hooks/use-network-status';
import { useUploadTasks } from '@/app/ui/hooks/use-upload-tasks';
import { Button } from '@/components/ui/button';
import { Link, useRouter } from '@/i18n/navigation';

type UploadCenterProps = {
  storages: UploadStorageOption[];
};

export function UploadCenter({ storages }: UploadCenterProps) {
  const t = useTranslations('dashboard.upload');
  const router = useRouter();

  const {
    ready,
    tasks,
    pauseTask,
    resumeTask,
    cancelTask,
    retryTask,
    pauseAll,
    resumeAll,
  } = useUploadTasks();

  const onOffline = useCallback(() => {
    pauseAll();
    showWarning(t('messages.networkOffline'));
  }, [pauseAll, t]);

  const onOnline = useCallback(() => {
    showInfo(t('messages.networkOnline'), {
      action: {
        label: t('messages.networkOnlineConfirm'),
        onClick: () => resumeAll(),
      },
    });
  }, [resumeAll, t]);

  useNetworkStatus({ onOffline, onOnline });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {t('queue.title')}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t('queue.description')}
          </p>
        </div>

        <Button asChild disabled={storages.length === 0} className="gap-1.5">
          <Link href="/dashboard/upload/create">
            <Plus className="h-4 w-4" />
            {t('createTask')}
          </Link>
        </Button>
      </div>

      {storages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-8 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
          {t('messages.noStorage')}
        </div>
      ) : null}

      <UploadStatsCards tasks={tasks} />

      {ready ? (
        <TaskList
          tasks={tasks}
          onPause={pauseTask}
          onResume={resumeTask}
          onCancel={cancelTask}
          onRetry={retryTask}
          onView={(taskId) => router.push(`/dashboard/upload/${taskId}`)}
        />
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white/80 p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
          {t('queue.description')}
        </div>
      )}
    </div>
  );
}