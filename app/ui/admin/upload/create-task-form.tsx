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
    <div className="space-y-6 rounded-xl border border-zinc-200 bg-white/90 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            {t('taskName')}
          </label>
          <Input
            value={taskName}
            onChange={(event) => setTaskName(event.target.value)}
            placeholder={t('taskNamePlaceholder')}
            className="border-zinc-200 bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/70"
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            {t('targetStorage')}
          </label>
          <Select value={storageId} onValueChange={setStorageId}>
            <SelectTrigger>
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
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            {t('fileCategory')}
          </label>
          <Select
            value={category}
            onValueChange={(value) => setCategory(value as UploadTaskCategory)}
          >
            <SelectTrigger className="md:max-w-[320px]">
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

      <DropZone
        files={files}
        onChange={setFiles}
        disabled={submitting}
        accept={categoryAccept(category)}
      />

      <AdvancedConfig value={config} onChange={setConfig} />

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/dashboard/upload')}
          disabled={submitting}
        >
          {t('cancel')}
        </Button>
        <Button type="button" onClick={submit} disabled={submitting}>
          {t('startUpload')}
        </Button>
      </div>
    </div>
  );
}