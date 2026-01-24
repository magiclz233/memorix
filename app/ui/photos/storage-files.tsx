'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { setHeroPhotos, setFilesPublished, setStoragePublished } from '@/app/lib/actions';
import { Button } from '@/components/ui/button';

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

function formatSize(size: number | null, t: any) {
  if (!size && size !== 0) return t('status.unknownSize');
  if (size < 1024) return `${size} B`;
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

function formatDate(value: Date | string | null, locale: string) {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
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
  const t = useTranslations('dashboard.storage.files');
  const tStorage = useTranslations('dashboard.storage');
  const locale = useLocale();
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
  const scanLabel = isScanning
    ? t('scan.scanning')
    : files.length > 0
      ? t('scan.rescan')
      : t('scan.scanNow');
  const isActionDisabled = isPending || isDisabled || isScanning;
  const progressText = scanProgress
    ? scanProgress.total > 0
      ? t('scan.processed', { processed: scanProgress.processed, total: scanProgress.total })
      : t('scan.processedSimple', { processed: scanProgress.processed })
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
      setMessage(t('messages.disabled'));
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
      setMessage(typeof data?.message === 'string' ? data.message : t('scan.complete'));
      setIsScanning(false);
      setSelectedIds([]);
      source.close();
      router.refresh();
    });

    source.addEventListener('error', () => {
      if (scanDoneRef.current) return;
      appendLog(t('scan.scanInterrupted'));
      setMessage(t('scan.scanFailed'));
      setIsScanning(false);
      source.close();
    });
  };

  const updateSelected = (isPublished: boolean) => {
    if (isDisabled) {
      setMessage(t('messages.disabled'));
      return;
    }
    if (!selectedIds.length) {
      setMessage(t('messages.selectFirst'));
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
      setMessage(t('messages.disabled'));
      return;
    }
    if (!selectedIds.length) {
      setMessage(t('messages.selectFirst'));
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
      setMessage(t('messages.disabled'));
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
        {tStorage('scanUnsupported')}
      </div>
    );
  }

  return (
    <section id='storage-scan' className='space-y-6 rounded-lg border border-gray-200 bg-white p-6'>
      {isDisabled ? (
        <div className='rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700'>
          {tStorage('configDisabled')}
        </div>
      ) : null}
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h2 className='text-lg font-semibold text-gray-900'>{t('scan.title')}</h2>
          <p className='text-sm text-gray-500'>
            {t('scan.description')}
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
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='rounded-full'
          onClick={() => setSelectedIds(allIds)}
          disabled={isActionDisabled}
        >
          {t('actions.selectAll')}
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='rounded-full'
          onClick={() => setSelectedIds([])}
          disabled={isActionDisabled}
        >
          {t('actions.clearSelection')}
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='rounded-full'
          onClick={() => updateSelected(true)}
          disabled={isActionDisabled}
        >
          {t('actions.publishSelected')}
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='rounded-full'
          onClick={() => updateSelected(false)}
          disabled={isActionDisabled}
        >
          {t('actions.unpublishSelected')}
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='rounded-full'
          onClick={() => updateSelectedHero(true)}
          disabled={isActionDisabled}
        >
          {t('actions.setHero')}
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='rounded-full'
          onClick={() => updateSelectedHero(false)}
          disabled={isActionDisabled}
        >
          {t('actions.unsetHero')}
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='rounded-full'
          onClick={() => updateAll(true)}
          disabled={isActionDisabled}
        >
          {t('actions.publishAll')}
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='rounded-full'
          onClick={() => updateAll(false)}
          disabled={isActionDisabled}
        >
          {t('actions.unpublishAll')}
        </Button>
        <span className='text-gray-500'>{t('messages.selectedCount', { count: selectedCount })}</span>
        {message ? <span className='text-gray-500'>{message}</span> : null}
      </div>

      {scanLogs.length > 0 || isScanning ? (
        <div className='rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-gray-600'>
          <div className='flex flex-wrap items-center justify-between gap-2 text-gray-500'>
            <span>{t('scan.logs')}</span>
            {progressText ? <span>{progressText}</span> : null}
          </div>
          <div className='mt-2 max-h-56 overflow-auto whitespace-pre-wrap font-mono text-gray-600'>
            {scanLogs.length > 0 ? (
              scanLogs.map((line, index) => <div key={`${index}-${line}`}>{line}</div>)
            ) : (
              <div>{t('scan.waitingLogs')}</div>
            )}
          </div>
        </div>
      ) : null}

      {files.length === 0 ? (
        <div className='rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500'>
          {t('scan.empty')}
        </div>
      ) : (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {files.map((file) => {
            const isChecked = selectedIds.includes(file.id);
            const title = file.title ?? file.path;
            const meta = [
              formatSize(file.size ?? null, t),
              formatDate(file.mtime ?? null, locale),
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
                    {file.isPublished ? t('status.published') : t('status.unpublished')}
                  </div>
                  <div className='text-xs text-gray-500'>
                    {heroIdSet.has(file.id) ? t('status.hero') : t('status.notHero')}
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
