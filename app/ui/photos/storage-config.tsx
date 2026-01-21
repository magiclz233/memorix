'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { saveUserStorage } from '@/app/lib/actions';
import { Button } from '@/app/ui/button';

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

const STORAGE_TYPES = [
  { value: 'local', label: '本地存储' },
  { value: 'nas', label: 'NAS 存储' },
  { value: 'qiniu', label: '七牛云' },
  { value: 's3', label: 'S3 兼容' },
] as const;

export function StorageConfigForm({ storage }: StorageConfigFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const config = (storage?.config ?? {}) as StorageConfig;
  const [editingId, setEditingId] = useState<number | undefined>(
    () => storage?.id,
  );
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
          当前配置已禁用，启用后才能扫描与展示。
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
            <label className='text-sm font-medium text-gray-700'>目录路径</label>
            <input
              value={rootPath}
              onChange={(event) => setRootPath(event.target.value)}
              className='w-full rounded-lg border border-gray-200 px-3 py-2 text-sm'
              placeholder='例如 /data/photos 或 D:\\Photos'
            />
            <p className='text-xs text-gray-500'>填写容器内或本机可访问的路径。</p>
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700'>别名（可选）</label>
            <input
              value={alias}
              onChange={(event) => setAlias(event.target.value)}
              className='w-full rounded-lg border border-gray-200 px-3 py-2 text-sm'
              placeholder='例如 NAS 相册 A'
            />
          </div>
        </div>
      ) : (
        <div className='grid gap-4 md:grid-cols-2'>
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700'>Endpoint</label>
            <input
              value={endpoint}
              onChange={(event) => setEndpoint(event.target.value)}
              className='w-full rounded-lg border border-gray-200 px-3 py-2 text-sm'
              placeholder='https://s3.example.com'
            />
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700'>Bucket</label>
            <input
              value={bucket}
              onChange={(event) => setBucket(event.target.value)}
              className='w-full rounded-lg border border-gray-200 px-3 py-2 text-sm'
              placeholder='your-bucket'
            />
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700'>Region</label>
            <input
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              className='w-full rounded-lg border border-gray-200 px-3 py-2 text-sm'
              placeholder='ap-east-1'
            />
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700'>Access Key</label>
            <input
              value={accessKey}
              onChange={(event) => setAccessKey(event.target.value)}
              className='w-full rounded-lg border border-gray-200 px-3 py-2 text-sm'
            />
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700'>Secret Key</label>
            <input
              value={secretKey}
              onChange={(event) => setSecretKey(event.target.value)}
              className='w-full rounded-lg border border-gray-200 px-3 py-2 text-sm'
            />
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700'>前缀（可选）</label>
            <input
              value={prefix}
              onChange={(event) => setPrefix(event.target.value)}
              className='w-full rounded-lg border border-gray-200 px-3 py-2 text-sm'
              placeholder='photos/'
            />
          </div>
          <p className='text-xs text-gray-500 md:col-span-2'>
            云存储扫描与展示后续再接入，目前仅保存配置。
          </p>
        </div>
      )}

      <div className='flex flex-wrap items-center gap-3'>
        <Button type='submit' aria-disabled={isPending}>
          {editingId ? '更新配置' : '保存配置'}
        </Button>
        <button
          type='button'
          className='text-sm text-gray-500 hover:text-gray-700'
          onClick={resetToCreate}
        >
          新建配置
        </button>
        {message ? <span className='text-sm text-gray-500'>{message}</span> : null}
      </div>
    </form>
  );
}
