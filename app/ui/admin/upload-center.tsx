'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, FileText, UploadCloud, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type UploadStorageOption = {
  id: number;
  label: string;
  description?: string;
};

type UploadItemStatus = 'waiting' | 'uploading' | 'done' | 'error';

type UploadItem = {
  id: string;
  file: File;
  progress: number;
  status: UploadItemStatus;
};

type UploadCenterProps = {
  storages: UploadStorageOption[];
};

const formatBytes = (value: number) => {
  if (!Number.isFinite(value)) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

export function UploadCenter({ storages }: UploadCenterProps) {
  const t = useTranslations('dashboard.upload');
  const [selectedStorageId, setSelectedStorageId] = useState<number | null>(
    storages[0]?.id ?? null,
  );
  const [dragActive, setDragActive] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedStorage = useMemo(
    () => storages.find((storage) => storage.id === selectedStorageId) ?? null,
    [storages, selectedStorageId],
  );

  const updateUpload = useCallback((id: string, patch: Partial<UploadItem>) => {
    setUploads((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }, []);

  const startUpload = useCallback(
    (item: UploadItem) => {
      updateUpload(item.id, { status: 'uploading', progress: 0 });
      const reader = new FileReader();
      reader.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const progress = Math.min(
          100,
          Math.round((event.loaded / event.total) * 100),
        );
        updateUpload(item.id, { progress });
      };
      reader.onload = () => {
        updateUpload(item.id, { progress: 100, status: 'done' });
      };
      reader.onerror = () => {
        updateUpload(item.id, { status: 'error' });
      };
      reader.readAsArrayBuffer(item.file);
    },
    [updateUpload],
  );

  const enqueueFiles = useCallback(
    (files: FileList | File[]) => {
      if (!selectedStorageId) return;
      const nextItems: UploadItem[] = Array.from(files).map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()
          .toString(16)
          .slice(2)}`,
        file,
        progress: 0,
        status: 'waiting',
      }));
      setUploads((prev) => [...nextItems, ...prev]);
      nextItems.forEach(startUpload);
    },
    [selectedStorageId, startUpload],
  );

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (!selectedStorageId) return;
    if (event.dataTransfer.files?.length) {
      enqueueFiles(event.dataTransfer.files);
    }
  };

  const handlePickFiles = () => {
    inputRef.current?.click();
  };

  const canUpload = Boolean(selectedStorageId);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <section className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {t('queue.title')}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t('queue.description')}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            {t('queue.uploadTo')}
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select
              value={selectedStorageId ?? ''}
              onChange={(event) =>
                setSelectedStorageId(
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              className="min-w-[220px] rounded-full border border-zinc-200 bg-white/80 px-4 py-2 text-sm text-zinc-700 shadow-sm backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
            >
              {storages.length === 0 ? (
                <option value="">{t('queue.noStorage')}</option>
              ) : null}
              {storages.map((storage) => (
                <option key={storage.id} value={storage.id}>
                  {storage.label}
                </option>
              ))}
            </select>
            {selectedStorage?.description ? (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {selectedStorage.description}
              </span>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          {uploads.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/70 p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
              {t('queue.empty')}
            </div>
          ) : (
            uploads.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-500 dark:bg-indigo-500/20">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {item.file.name}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatBytes(item.file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.status === 'done' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : null}
                    {item.status === 'error' ? (
                      <XCircle className="h-4 w-4 text-rose-500" />
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      item.status === 'error'
                        ? 'bg-rose-500'
                        : 'bg-indigo-500',
                    )}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>
                    {item.status === 'done'
                      ? t('queue.status.done')
                      : item.status === 'error'
                        ? t('queue.status.error')
                        : t('queue.status.uploading')}
                  </span>
                  <span>{item.progress}%</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {t('drag.title')}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t('drag.description')}
          </p>
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            if (canUpload) setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={cn(
            'flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center text-sm text-zinc-500 transition dark:border-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400',
            dragActive && canUpload
              ? 'border-indigo-400 bg-indigo-50/60 text-indigo-600 dark:border-indigo-500/60 dark:bg-indigo-500/10 dark:text-indigo-300'
              : null,
            !canUpload ? 'opacity-70' : null,
          )}
        >
          <UploadCloud className="h-8 w-8" />
          <div className="space-y-1">
            <p className="text-base font-medium text-zinc-800 dark:text-zinc-100">
              {canUpload ? t('drag.dropHere') : t('drag.selectStorageFirst')}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t('drag.formats')}
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              if (event.target.files?.length) {
                enqueueFiles(event.target.files);
                event.target.value = '';
              }
            }}
            disabled={!canUpload}
          />
          <Button type="button" variant="outline" onClick={handlePickFiles} disabled={!canUpload}>
            {t('drag.selectFile')}
          </Button>
        </div>
      </section>
    </div>
  );
}
