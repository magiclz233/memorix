'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { scanStorage, setFilesPublished, setStoragePublished } from '@/app/lib/actions';
import { Button } from '@/app/ui/button';

type StorageFile = {
  id: number;
  title: string | null;
  path: string;
  size: number | null;
  mimeType: string | null;
  mtime: Date | string | null;
  isPublished: boolean | null;
  resolutionWidth: number | null;
  resolutionHeight: number | null;
};

type StorageFilesManagerProps = {
  storageId: number;
  storageType: string;
  files: StorageFile[];
};

function formatSize(size: number | null) {
  if (!size && size !== 0) return '未知大小';
  if (size < 1024) return `${size} B`;
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

function formatDate(value: Date | string | null) {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function StorageFilesManager({ storageId, storageType, files }: StorageFilesManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const allIds = useMemo(() => files.map((item) => item.id), [files]);
  const selectedCount = selectedIds.length;

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleScan = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await scanStorage(storageId);
      setMessage(result.message ?? null);
      router.refresh();
    });
  };

  const updateSelected = (isPublished: boolean) => {
    if (!selectedIds.length) {
      setMessage('请先选择要更新的图片。');
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await setFilesPublished(selectedIds, isPublished);
      setMessage(result.message ?? null);
      router.refresh();
    });
  };

  const updateAll = (isPublished: boolean) => {
    setMessage(null);
    startTransition(async () => {
      const result = await setStoragePublished(storageId, isPublished);
      setMessage(result.message ?? null);
      router.refresh();
    });
  };

  if (storageType !== 'local' && storageType !== 'nas') {
    return (
      <div className='rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500'>
        当前存储类型暂不支持扫描与展示。
      </div>
    );
  }

  return (
    <section className='space-y-6 rounded-lg border border-gray-200 bg-white p-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h2 className='text-lg font-semibold text-gray-900'>目录扫描</h2>
          <p className='text-sm text-gray-500'>扫描后可以选择哪些图片进入图库。</p>
        </div>
        <Button type='button' aria-disabled={isPending} onClick={handleScan}>
          立即扫描
        </Button>
      </div>

      <div className='flex flex-wrap items-center gap-3 text-sm'>
        <button
          type='button'
          className='rounded-full border border-gray-200 px-3 py-1 text-gray-600 hover:border-blue-300 hover:text-blue-600'
          onClick={() => setSelectedIds(allIds)}
        >
          全选
        </button>
        <button
          type='button'
          className='rounded-full border border-gray-200 px-3 py-1 text-gray-600 hover:border-blue-300 hover:text-blue-600'
          onClick={() => setSelectedIds([])}
        >
          清空选择
        </button>
        <button
          type='button'
          className='rounded-full border border-gray-200 px-3 py-1 text-gray-600 hover:border-blue-300 hover:text-blue-600'
          onClick={() => updateSelected(true)}
        >
          发布选中
        </button>
        <button
          type='button'
          className='rounded-full border border-gray-200 px-3 py-1 text-gray-600 hover:border-blue-300 hover:text-blue-600'
          onClick={() => updateSelected(false)}
        >
          取消发布
        </button>
        <button
          type='button'
          className='rounded-full border border-gray-200 px-3 py-1 text-gray-600 hover:border-blue-300 hover:text-blue-600'
          onClick={() => updateAll(true)}
        >
          全部发布
        </button>
        <button
          type='button'
          className='rounded-full border border-gray-200 px-3 py-1 text-gray-600 hover:border-blue-300 hover:text-blue-600'
          onClick={() => updateAll(false)}
        >
          全部取消
        </button>
        <span className='text-gray-500'>已选 {selectedCount} 张</span>
        {message ? <span className='text-gray-500'>{message}</span> : null}
      </div>

      {files.length === 0 ? (
        <div className='rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500'>
          暂无图片，点击“立即扫描”开始读取目录。
        </div>
      ) : (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {files.map((file) => {
            const isChecked = selectedIds.includes(file.id);
            const title = file.title ?? file.path;
            const meta = [
              formatSize(file.size ?? null),
              formatDate(file.mtime ?? null),
              file.resolutionWidth && file.resolutionHeight
                ? `${file.resolutionWidth}×${file.resolutionHeight}`
                : null,
            ]
              .filter(Boolean)
              .join(' · ');

            return (
              <label
                key={file.id}
                className={`group relative overflow-hidden rounded-xl border ${
                  isChecked ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                }`}
              >
                <input
                  type='checkbox'
                  checked={isChecked}
                  onChange={() => toggleSelect(file.id)}
                  className='absolute left-3 top-3 z-10 h-4 w-4 accent-blue-600'
                />
                <div className='aspect-square w-full overflow-hidden bg-gray-100'>
                  <img
                    src={`/api/local-files/${file.id}`}
                    alt={title}
                    loading='lazy'
                    className='h-full w-full object-cover transition duration-300 group-hover:scale-105'
                  />
                </div>
                <div className='space-y-1 p-3'>
                  <div className='truncate text-sm font-medium text-gray-900'>{title}</div>
                  <div className='text-xs text-gray-500'>{meta}</div>
                  <div className='text-xs text-gray-500'>
                    {file.isPublished ? '已发布' : '未发布'}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </section>
  );
}
