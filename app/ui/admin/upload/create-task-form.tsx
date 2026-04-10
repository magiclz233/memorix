'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import type {
  TaskConfig,
  UploadStorageOption,
  UploadTaskCategory,
} from '@/app/lib/definitions';
import { createTaskConfig } from '@/app/lib/upload-task-utils';
import { showError, showSuccess } from '@/app/lib/toast-utils';
import { AdvancedConfig } from '@/app/ui/admin/upload/advanced-config';
import { DropZone } from '@/app/ui/admin/upload/drop-zone';
import { useUploadTasks } from '@/app/ui/hooks/use-upload-tasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from '@/i18n/navigation';

type CreateTaskFormProps = {
  storages: UploadStorageOption[];
};

function categoryAccept(category: UploadTaskCategory) {
  if (category === 'photo') {
    return 'image/*';
  }

  if (category === 'video') {
    return 'video/*';
  }

  return 'image/*,video/*,.pdf,.doc,.docx,.txt';
}

export function CreateTaskForm({ storages }: CreateTaskFormProps) {
  const t = useTranslations('dashboard.upload');
  const router = useRouter();
  const { createTask } = useUploadTasks();

  const [taskName, setTaskName] = useState('');
  const [storageId, setStorageId] = useState<string>(storages[0]?.id ? String(storages[0].id) : '');
  const [category, setCategory] = useState<UploadTaskCategory>('photo');
  const [files, setFiles] = useState<File[]>([]);
  const [config, setConfig] = useState<TaskConfig>(createTaskConfig());
  const [submitting, setSubmitting] = useState(false);

  const selectedStorage = useMemo(
    () => storages.find((item) => String(item.id) === storageId) ?? null,
    [storages, storageId],
  );

  const submit = async () => {
    if (!taskName.trim()) {
      showError(t('messages.taskNameRequired'));
      return;
    }

    if (!selectedStorage) {
      showError(t('messages.storageRequired'));
      return;
    }

    if (files.length === 0) {
      showError(t('messages.filesRequired'));
      return;
    }

    try {
      setSubmitting(true);
      createTask({
        name: taskName.trim(),
        storage: selectedStorage,
        category,
        files,
        config,
      });

      showSuccess(t('messages.taskCreated'));
      router.push('/dashboard/upload');
    } catch (error) {
      console.error('createTask failed', error);
      showError(t('messages.uploadFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3 xl:gap-8">
      <div className="space-y-6 lg:col-span-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t('taskName')}
              </label>
              <Input
                value={taskName}
                onChange={(event) => setTaskName(event.target.value)}
                placeholder={t('taskNamePlaceholder')}
                className="border-zinc-200 bg-zinc-50/50 focus-visible:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900/50"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t('targetStorage')}
              </label>
              <Select value={storageId} onValueChange={setStorageId}>
                <SelectTrigger className="border-zinc-200 bg-zinc-50/50 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <SelectValue placeholder={t('targetStoragePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {storages.map((storage) => (
                    <SelectItem key={storage.id} value={String(storage.id)}>
                      {storage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t('fileCategory')}
              </label>
              <Select
                value={category}
                onValueChange={(value) => setCategory(value as UploadTaskCategory)}
              >
                <SelectTrigger className="border-zinc-200 bg-zinc-50/50 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900/50 md:max-w-xs">
                  <SelectValue placeholder={t('fileCategoryPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="photo">{t('categoryPhoto')}</SelectItem>
                  <SelectItem value="video">{t('categoryVideo')}</SelectItem>
                  <SelectItem value="document">{t('categoryDocument')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <label className="mb-3 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            任务文件
          </label>
          <DropZone
            files={files}
            onChange={setFiles}
            disabled={submitting}
            accept={categoryAccept(category)}
          />
        </div>
      </div>

      <div className="space-y-6 lg:col-span-1">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <AdvancedConfig value={config} onChange={setConfig} />
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/30">
          <Button
            type="button"
            className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-bold tracking-wide"
            onClick={submit}
            disabled={submitting}
          >
            {t('startUpload')}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => router.push('/dashboard/upload')}
            disabled={submitting}
          >
            {t('cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}