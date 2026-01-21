'use client';

import { useState, useTransition } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { deleteUserStorage, setUserStorageDisabled } from '@/app/lib/actions';

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
  prefix?: string | null;
  isDisabled?: boolean;
};

type StorageListManagerProps = {
  storages: StorageItem[];
  activeStorageId?: number;
};

const STORAGE_LABELS: Record<string, string> = {
  local: '本地存储',
  nas: 'NAS 存储',
  qiniu: '七牛云',
  s3: 'S3 兼容',
};

function getStorageSummary(storage: StorageItem) {
  const config = (storage.config ?? {}) as StorageConfig;
  const label = STORAGE_LABELS[storage.type] ?? storage.type.toUpperCase();
  const alias = config.alias?.trim();
  const isLocal = storage.type === 'local' || storage.type === 'nas';
  const detail = isLocal
    ? config.rootPath?.trim()
    : config.bucket?.trim() ?? config.endpoint?.trim();
  const extra = config.prefix?.trim();

  return {
    label,
    displayName: alias || label,
    detail,
    extra,
    isLocal,
    isDisabled: Boolean(config.isDisabled),
  };
}

export function StorageListManager({
  storages,
  activeStorageId,
}: StorageListManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const handleToggle = (storageId: number, nextDisabled: boolean) => {
    setMessage(null);
    setPendingId(storageId);
    startTransition(async () => {
      const result = await setUserStorageDisabled(storageId, nextDisabled);
      setMessage(result.message ?? null);
      setPendingId(null);
      router.refresh();
    });
  };

  const handleDelete = (storageId: number, displayName: string) => {
    if (!window.confirm(`确定删除“${displayName}”？删除后图片记录会一并移除。`)) {
      return;
    }
    setMessage(null);
    setPendingId(storageId);
    startTransition(async () => {
      const result = await deleteUserStorage(storageId);
      setMessage(result.message ?? null);
      setPendingId(null);
      router.refresh();
    });
  };

  return (
    <section className='space-y-4 rounded-lg border border-gray-200 bg-white p-6'>
      <div>
        <h2 className='text-lg font-semibold text-gray-900'>存储列表</h2>
        <p className='text-sm text-gray-500'>
          选择要管理的配置，可编辑、禁用或切换到扫描。
        </p>
      </div>
      <div className='space-y-3'>
        {storages.map((storage) => {
          const summary = getStorageSummary(storage);
          const isActive = storage.id === activeStorageId;
          const canScan = summary.isLocal;
          const isItemPending = isPending && pendingId === storage.id;

          return (
            <div
              key={storage.id}
              className={`flex flex-wrap items-start justify-between gap-4 rounded-xl border p-4 ${
                isActive ? 'border-blue-500 bg-blue-50/40' : 'border-gray-200'
              }`}
            >
              <div className='space-y-2'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='text-sm font-semibold text-gray-900'>
                    {summary.displayName}
                  </span>
                  <span className='rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600'>
                    {summary.label}
                  </span>
                  {isActive ? (
                    <span className='rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white'>
                      当前
                    </span>
                  ) : null}
                  {summary.isDisabled ? (
                    <span className='rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700'>
                      已禁用
                    </span>
                  ) : null}
                </div>
                {summary.detail ? (
                  <p className='text-xs text-gray-500 break-all'>{summary.detail}</p>
                ) : (
                  <p className='text-xs text-gray-400'>暂无详细信息</p>
                )}
                {summary.extra ? (
                  <p className='text-xs text-gray-500'>前缀：{summary.extra}</p>
                ) : null}
              </div>
              <div className='flex flex-wrap gap-2 text-sm'>
                <Link
                  href={`/dashboard/media?storageId=${storage.id}`}
                  className='rounded-full border border-gray-200 px-3 py-1 text-gray-700 hover:border-blue-300 hover:text-blue-600'
                >
                  编辑
                </Link>
                {canScan ? (
                  <Link
                    href={`/dashboard/media?storageId=${storage.id}`}
                    className='rounded-full border border-gray-200 px-3 py-1 text-gray-700 hover:border-blue-300 hover:text-blue-600'
                  >
                    扫描
                  </Link>
                ) : null}
                <button
                  type='button'
                  className='rounded-full border border-gray-200 px-3 py-1 text-gray-700 hover:border-blue-300 hover:text-blue-600'
                  onClick={() => handleToggle(storage.id, !summary.isDisabled)}
                  disabled={isItemPending}
                >
                  {summary.isDisabled ? '启用' : '禁用'}
                </button>
                <button
                  type='button'
                  className='rounded-full border border-gray-200 px-3 py-1 text-gray-700 hover:border-red-300 hover:text-red-600'
                  onClick={() => handleDelete(storage.id, summary.displayName)}
                  disabled={isItemPending}
                >
                  删除
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {message ? <p className='text-sm text-gray-500'>{message}</p> : null}
    </section>
  );
}
