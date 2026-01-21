'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { setHeroPhotos, setFilesPublished, setStoragePublished } from '@/app/lib/actions';
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
  isDisabled?: boolean;
  heroIds?: number[];
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

export function StorageFilesManager({
  storageId,
  storageType,
  files,
  isDisabled = false,
  heroIds = [],
}: StorageFilesManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [scanProgress, setScanProgress] = useState<{ processed: number; total: number } | null>(
    null,
  );
  const [isScanning, setIsScanning] = useState(false);
  const scanSourceRef = useRef<EventSource | null>(null);
  const scanDoneRef = useRef(false);

  const allIds = useMemo(() => files.map((item) => item.id), [files]);
  const selectedCount = selectedIds.length;
  const canScan = storageType === 'local' || storageType === 'nas';
  const scanLabel = isScanning ? '扫描中...' : files.length > 0 ? '重新扫描' : '立即扫描';
  const isActionDisabled = isPending || isDisabled || isScanning;
  const progressText = scanProgress
    ? scanProgress.total > 0
      ? `已处理 ${scanProgress.processed}/${scanProgress.total}`
      : `已处理 ${scanProgress.processed}`
    : null;
  const heroIdSet = useMemo(() => new Set(heroIds), [heroIds]);

  useEffect(() => {
    return () => {
      scanSourceRef.current?.close();
    };
  }, []);

  const appendLog = (line: string) => {
    setScanLogs((prev) => {
      const next = [...prev, line];
      return next.length > 200 ? next.slice(-200) : next;
    });
  };

  const parseEventData = (event: MessageEvent) => {
    try {
      return JSON.parse(event.data);
    } catch {
      return null;
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleScan = () => {
    if (isDisabled) {
      setMessage('当前配置已禁用，请先启用。');
      return;
    }
    if (isScanning) {
      return;
    }
    setMessage(null);
    setScanLogs([]);
    setScanProgress(null);
    setIsScanning(true);
    scanDoneRef.current = false;
    scanSourceRef.current?.close();

    const source = new EventSource(`/api/storage/scan?storageId=${storageId}`);
    scanSourceRef.current = source;

    source.addEventListener('log', (event) => {
      const data = parseEventData(event);
      if (!data || typeof data.message !== 'string') return;
      const prefix = typeof data.level === 'string' ? `[${data.level}] ` : '';
      appendLog(`${prefix}${data.message}`);
    });

    source.addEventListener('progress', (event) => {
      const data = parseEventData(event);
      if (!data) return;
      const processed = Number(data.processed);
      const total = Number(data.total);
      if (!Number.isFinite(processed)) return;
      setScanProgress({
        processed,
        total: Number.isFinite(total) ? total : 0,
      });
    });

    source.addEventListener('done', (event) => {
      scanDoneRef.current = true;
      const data = parseEventData(event);
      setMessage(typeof data?.message === 'string' ? data.message : '扫描完成。');
      setIsScanning(false);
      setSelectedIds([]);
      source.close();
      router.refresh();
    });

    source.addEventListener('error', () => {
      if (scanDoneRef.current) return;
      appendLog('扫描连接已中断。');
      setMessage('扫描失败或连接中断。');
      setIsScanning(false);
      source.close();
    });
  };

  const updateSelected = (isPublished: boolean) => {
    if (isDisabled) {
      setMessage('当前配置已禁用，请先启用。');
      return;
    }
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

  const updateSelectedHero = (isHero: boolean) => {
    if (isDisabled) {
      setMessage('当前配置已禁用，请先启用。');
      return;
    }
    if (!selectedIds.length) {
      setMessage('请先选择要更新的图片。');
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await setHeroPhotos(selectedIds, isHero);
      setMessage(result.message ?? null);
      router.refresh();
    });
  };

  const updateAll = (isPublished: boolean) => {
    if (isDisabled) {
      setMessage('当前配置已禁用，请先启用。');
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await setStoragePublished(storageId, isPublished);
      setMessage(result.message ?? null);
      router.refresh();
    });
  };

  if (!canScan) {
    return (
      <div className='rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500'>
        当前存储类型暂不支持扫描与展示。
      </div>
    );
  }

  return (
    <section id='storage-scan' className='space-y-6 rounded-lg border border-gray-200 bg-white p-6'>
      {isDisabled ? (
        <div className='rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700'>
          当前配置已禁用，启用后才能扫描与更新发布状态。
        </div>
      ) : null}
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h2 className='text-lg font-semibold text-gray-900'>目录扫描</h2>
          <p className='text-sm text-gray-500'>
            扫描后可以选择哪些图片进入图库，重新扫描会清空旧记录。
          </p>
        </div>
        <Button
          type='button'
          aria-disabled={isActionDisabled}
          disabled={isActionDisabled}
          onClick={handleScan}
        >
          {scanLabel}
        </Button>
      </div>

      <div className='flex flex-wrap items-center gap-3 text-sm'>
        <button
          type='button'
          className='rounded-full border border-gray-200 px-3 py-1 text-gray-600 hover:border-blue-300 hover:text-blue-600'
          onClick={() => setSelectedIds(allIds)}
          disabled={isActionDisabled}
        >
          全选
        </button>
        <button
          type='button'
          className='rounded-full border border-gray-200 px-3 py-1 text-gray-600 hover:border-blue-300 hover:text-blue-600'
          onClick={() => setSelectedIds([])}
          disabled={isActionDisabled}
        >
          清空选择
        </button>
        <button
          type='button'
          className='rounded-full border border-gray-200 px-3 py-1 text-gray-600 hover:border-blue-300 hover:text-blue-600'
          onClick={() => updateSelected(true)}
          disabled={isActionDisabled}
        >
          发布选中
        </button>
        <button
          type='button'
          className='rounded-full border border-gray-200 px-3 py-1 text-gray-600 hover:border-blue-300 hover:text-blue-600'
          onClick={() => updateSelected(false)}
          disabled={isActionDisabled}
        >
          取消发布
        </button>
        <button
          type='button'
          className='rounded-full border border-gray-200 px-3 py-1 text-gray-600 hover:border-blue-300 hover:text-blue-600'
          onClick={() => updateSelectedHero(true)}
          disabled={isActionDisabled}
        >
          设为首页
        </button>
        <button
          type='button'
          className='rounded-full border border-gray-200 px-3 py-1 text-gray-600 hover:border-blue-300 hover:text-blue-600'
          onClick={() => updateSelectedHero(false)}
          disabled={isActionDisabled}
        >
          取消首页
        </button>
        <button
          type='button'
          className='rounded-full border border-gray-200 px-3 py-1 text-gray-600 hover:border-blue-300 hover:text-blue-600'
          onClick={() => updateAll(true)}
          disabled={isActionDisabled}
        >
          全部发布
        </button>
        <button
          type='button'
          className='rounded-full border border-gray-200 px-3 py-1 text-gray-600 hover:border-blue-300 hover:text-blue-600'
          onClick={() => updateAll(false)}
          disabled={isActionDisabled}
        >
          全部取消
        </button>
        <span className='text-gray-500'>已选 {selectedCount} 张</span>
        {message ? <span className='text-gray-500'>{message}</span> : null}
      </div>

      {scanLogs.length > 0 || isScanning ? (
        <div className='rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-gray-600'>
          <div className='flex flex-wrap items-center justify-between gap-2 text-gray-500'>
            <span>扫描日志</span>
            {progressText ? <span>{progressText}</span> : null}
          </div>
          <div className='mt-2 max-h-56 overflow-auto whitespace-pre-wrap font-mono text-gray-600'>
            {scanLogs.length > 0 ? (
              scanLogs.map((line, index) => <div key={`${index}-${line}`}>{line}</div>)
            ) : (
              <div>等待扫描日志...</div>
            )}
          </div>
        </div>
      ) : null}

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
                  <div className='text-xs text-gray-500'>
                    {heroIdSet.has(file.id) ? '首页展示' : '未设为首页'}
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
