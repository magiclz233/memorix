'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

import { saveUserStorage } from '@/app/lib/actions';
import { Button } from '@/components/ui/button';

type StorageItem = {
  id: number;
  type: string;
  config: unknown;
};

type StorageConfig = {
  rootPath?: string | null;
  alias?: string | null;
  endpoint?: string | null;
  bucket?: string | null;
  region?: string | null;
  accessKey?: string | null;
  secretKey?: string | null;
  prefix?: string | null;
  isDisabled?: boolean;
};

type StorageConfigFormProps = {
  storage: StorageItem | null;
};

export function StorageConfigForm({ storage }: StorageConfigFormProps) {
  const t = useTranslations('dashboard.storage.form');

  const STORAGE_TYPES = [
    { value: 'local', label: t('types.local') },
    { value: 'nas', label: t('types.nas') },
    { value: 'qiniu', label: t('types.qiniu') },
    { value: 's3', label: t('types.s3') },
  ] as const;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const config = (storage?.config ?? {}) as StorageConfig;
  const [editingId, setEditingId] = useState<number | undefined>(
    () => storage?.id,
  );
  const [isDisabled, setIsDisabled] = useState(() => config.isDisabled ?? false);
  const [type, setType] = useState(() => storage?.type ?? 'local');
  const [rootPath, setRootPath] = useState(() => config.rootPath ?? '');
  const [alias, setAlias] = useState(() => config.alias ?? '');
  const [endpoint, setEndpoint] = useState(() => config.endpoint ?? '');
  const [bucket, setBucket] = useState(() => config.bucket ?? '');
  const [region, setRegion] = useState(() => config.region ?? '');
  const [accessKey, setAccessKey] = useState(() => config.accessKey ?? '');
  const [secretKey, setSecretKey] = useState(() => config.secretKey ?? '');
  const [prefix, setPrefix] = useState(() => config.prefix ?? '');
  const [message, setMessage] = useState<string | null>(null);

  const resetToCreate = () => {
    setEditingId(undefined);
    setType('local');
    setRootPath('');
    setAlias('');
    setEndpoint('');
    setBucket('');
    setRegion('');
    setAccessKey('');
    setSecretKey('');
    setPrefix('');
    setIsDisabled(false);
    setMessage(null);
  };

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await saveUserStorage({
        id: editingId,
        type: type as 'local' | 'nas' | 'qiniu' | 's3',
        rootPath,
        alias,
        endpoint,
        bucket,
        region,
        accessKey,
        secretKey,
        prefix,
        isDisabled,
      });

      setMessage(result.message ?? null);
      if (result.storageId && result.storageId !== editingId) {
        router.replace(`/dashboard/media?storageId=${result.storageId}`);
      }
      router.refresh();
    });
  };

  const isLocal = type === 'local' || type === 'nas';

  return (
    <form onSubmit={handleSave} className='space-y-6'>
      {config.isDisabled ? (
        <div className='rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700'>
          {t('warnings.disabled')}
        </div>
      ) : null}
      <div className='flex flex-wrap items-center gap-3'>
        {STORAGE_TYPES.map((item) => (
          <label
            key={item.value}
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${
              type === item.value
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-200 text-gray-700'
            }`}
          >
            <input
              type='radio'
              name='storageType'
              value={item.value}
              checked={type === item.value}
              onChange={() => setType(item.value)}
              className='hidden'
            />
            {item.label}
          </label>
        ))}
      </div>

      {isLocal ? (
        <div className='grid gap-4 md:grid-cols-2'>
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700'>{t('labels.rootPath')}</label>
            <input
              value={rootPath}
              onChange={(event) => setRootPath(event.target.value)}
              className='w-full rounded-lg border border-gray-200 px-3 py-2 text-sm'
              placeholder={t('placeholders.rootPath')}
            />
            <p className='text-xs text-gray-500'>{t('hints.rootPath')}</p>
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700'>{t('labels.alias')}</label>
            <input
              value={alias}
              onChange={(event) => setAlias(event.target.value)}
              className='w-full rounded-lg border border-gray-200 px-3 py-2 text-sm'
              placeholder={t('placeholders.alias')}
            />
          </div>
        </div>
      ) : (
        <div className='grid gap-4 md:grid-cols-2'>
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700'>{t('labels.endpoint')}</label>
            <input
              value={endpoint}
              onChange={(event) => setEndpoint(event.target.value)}
              className='w-full rounded-lg border border-gray-200 px-3 py-2 text-sm'
              placeholder={t('placeholders.endpoint')}
            />
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700'>{t('labels.bucket')}</label>
            <input
              value={bucket}
              onChange={(event) => setBucket(event.target.value)}
              className='w-full rounded-lg border border-gray-200 px-3 py-2 text-sm'
              placeholder={t('placeholders.bucket')}
            />
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700'>{t('labels.region')}</label>
            <input
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              className='w-full rounded-lg border border-gray-200 px-3 py-2 text-sm'
              placeholder={t('placeholders.region')}
            />
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700'>{t('labels.accessKey')}</label>
            <input
              value={accessKey}
              onChange={(event) => setAccessKey(event.target.value)}
              className='w-full rounded-lg border border-gray-200 px-3 py-2 text-sm'
            />
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700'>{t('labels.secretKey')}</label>
            <input
              value={secretKey}
              onChange={(event) => setSecretKey(event.target.value)}
              className='w-full rounded-lg border border-gray-200 px-3 py-2 text-sm'
            />
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700'>{t('labels.prefix')}</label>
            <input
              value={prefix}
              onChange={(event) => setPrefix(event.target.value)}
              className='w-full rounded-lg border border-gray-200 px-3 py-2 text-sm'
              placeholder={t('placeholders.prefix')}
            />
          </div>
          <p className='text-xs text-gray-500 md:col-span-2'>
            {t('hints.cloudNote')}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-zinc-200 bg-white/60 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isDisabled}
            onChange={(event) => setIsDisabled(event.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-700"
          />
          {t('labels.disabled')}
        </label>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {t('hints.disabled')}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" aria-disabled={isPending}>
          {editingId ? t('buttons.update') : t('buttons.save')}
        </Button>
        <Button type="button" variant="ghost" onClick={resetToCreate}>
          {t('buttons.create')}
        </Button>
        {message ? <span className='text-sm text-gray-500'>{message}</span> : null}
      </div>
    </form>
  );
}
