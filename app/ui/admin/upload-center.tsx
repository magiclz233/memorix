'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { CheckCircle2, FileText, UploadCloud, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

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
  const router = useRouter();
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

  const uploadChunked = useCallback(
    async (item: UploadItem, file: File): Promise<boolean> => {
      if (!selectedStorageId) return false;

      try {
        // Import chunked upload utilities
        const SparkMD5 = (await import('spark-md5')).default;
        const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

        // Calculate file hash
        updateUpload(item.id, { status: 'uploading', progress: 0 });

        const spark = new SparkMD5.ArrayBuffer();
        const chunks = Math.ceil(file.size / CHUNK_SIZE);
        let currentChunk = 0;

        const calculateHash = async (): Promise<string> => {
          return new Promise((resolve, reject) => {
            const fileReader = new FileReader();

            fileReader.onload = (e) => {
              if (e.target?.result) {
                spark.append(e.target.result as ArrayBuffer);
                currentChunk++;

                const hashProgress = (currentChunk / chunks) * 10; // 10% for hashing
                updateUpload(item.id, { progress: hashProgress });

                if (currentChunk < chunks) {
                  loadNext();
                } else {
                  resolve(spark.end());
                }
              }
            };

            fileReader.onerror = () => reject(new Error('Failed to read file'));

            const loadNext = () => {
              const start = currentChunk * CHUNK_SIZE;
              const end = Math.min(start + CHUNK_SIZE, file.size);
              fileReader.readAsArrayBuffer(file.slice(start, end));
            };

            loadNext();
          });
        };

        const fileHash = await calculateHash();

        // Initialize upload
        const initResponse = await fetch('/api/upload/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            fileHash,
            mimeType: file.type,
            storageId: selectedStorageId,
            targetPath: '',
            chunkSize: CHUNK_SIZE,
          }),
        });

        if (!initResponse.ok) {
          const errorBody = await initResponse.json().catch(() => ({}));
          throw new Error(errorBody.error || 'Failed to initialize upload');
        }

        const initData = await initResponse.json();

        // Check for instant upload
        if (initData.instantUpload) {
          updateUpload(item.id, { progress: 100, status: 'done' });
          return true;
        }

        const { uploadId, totalChunks, uploadedChunks } = initData;
        const uploadedChunkSet = new Set(uploadedChunks);

        // Upload chunks
        for (let i = 0; i < totalChunks; i++) {
          if (uploadedChunkSet.has(i)) continue;

          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunkBlob = file.slice(start, end);
          const chunkBuffer = await chunkBlob.arrayBuffer();
          const chunkHash = SparkMD5.ArrayBuffer.hash(chunkBuffer);

          const formData = new FormData();
          formData.append('uploadId', uploadId);
          formData.append('chunkIndex', i.toString());
          formData.append('chunkHash', chunkHash);
          formData.append('chunk', new Blob([chunkBuffer]));

          const chunkResponse = await fetch('/api/upload/chunk', {
            method: 'POST',
            body: formData,
          });

          if (!chunkResponse.ok) {
            const errorBody = await chunkResponse.json().catch(() => ({}));
            throw new Error(errorBody.error || 'Failed to upload chunk');
          }

          const uploadProgress = 10 + ((i + 1) / totalChunks) * 85; // 10-95%
          updateUpload(item.id, { progress: uploadProgress });
        }

        // Complete upload
        const completeResponse = await fetch('/api/upload/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadId }),
        });

        if (!completeResponse.ok) {
          const errorBody = await completeResponse.json().catch(() => ({}));
          throw new Error(errorBody.error || 'Failed to complete upload');
        }

        updateUpload(item.id, { progress: 100, status: 'done' });
        return true;
      } catch (error) {
        console.error('Chunked upload error:', error);
        return false;
      }
    },
    [selectedStorageId, updateUpload],
  );

  const startUpload = useCallback(
    async (item: UploadItem) => {
      if (!selectedStorageId) return;

      updateUpload(item.id, { status: 'uploading', progress: 0 });

      try {
        // Use chunked upload for files larger than 100MB
        const CHUNKED_THRESHOLD = 100 * 1024 * 1024;
        if (item.file.size > CHUNKED_THRESHOLD) {
          const chunkedDone = await uploadChunked(item, item.file);
          if (chunkedDone) {
            return;
          }
        }

        // 创建 FormData
        const formData = new FormData();
        formData.append('storageId', selectedStorageId.toString());
        formData.append('files', item.file);

        // 使用 XMLHttpRequest 以支持进度监听
        const xhr = new XMLHttpRequest();

        // 监听上传进度
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.min(
              100,
              Math.round((event.loaded / event.total) * 100),
            );
            updateUpload(item.id, { progress });
          }
        };

        // 监听上传完成
        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.success || response.results?.[0]?.success) {
                updateUpload(item.id, { progress: 100, status: 'done' });
              } else {
                updateUpload(item.id, { status: 'error' });
              }
            } catch (error) {
              console.error('Failed to parse response:', error);
              updateUpload(item.id, { status: 'error' });
            }
          } else {
            updateUpload(item.id, { status: 'error' });
          }
        };

        // 监听上传错误
        xhr.onerror = () => {
          updateUpload(item.id, { status: 'error' });
        };

        // 发送请求
        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      } catch (error) {
        console.error('Upload error:', error);
        updateUpload(item.id, { status: 'error' });
      }
    },
    [selectedStorageId, updateUpload, uploadChunked],
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
      
      // 并发上传控制：限制同时上传 3 个文件
      const MAX_CONCURRENT = 3;
      let activeCount = 0;
      let currentIndex = 0;

      const uploadNext = () => {
        if (currentIndex >= nextItems.length) {
          // 所有文件上传完成，重新验证媒体库页面
          if (activeCount === 0) {
            // 使用 router.refresh() 或其他方式重新验证
            // 这里简单地延迟一下，让用户看到完成状态
            setTimeout(() => {
              router.refresh();
            }, 500);
          }
          return;
        }

        while (activeCount < MAX_CONCURRENT && currentIndex < nextItems.length) {
          const item = nextItems[currentIndex];
          currentIndex++;
          activeCount++;

          startUpload(item).finally(() => {
            activeCount--;
            uploadNext();
          });
        }
      };

      uploadNext();
    },
    [selectedStorageId, startUpload, router],
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
                <Progress 
                  value={item.progress} 
                  className={cn(
                    "mt-4 h-2 w-full bg-zinc-100 dark:bg-zinc-800",
                    item.status === 'error' ? "[&>div]:bg-rose-500" : "[&>div]:bg-indigo-500"
                  )} 
                />
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
