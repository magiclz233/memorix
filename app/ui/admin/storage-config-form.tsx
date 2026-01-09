'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { saveUserStorage } from '@/app/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

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
  { value: 'nas', label: 'NAS' },
  { value: 's3', label: 'S3' },
  { value: 'qiniu', label: '七牛云' },
  { value: 'local', label: '本地' },
] as const;

export function StorageConfigForm({ storage }: StorageConfigFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const config = (storage?.config ?? {}) as StorageConfig;
  const [editingId, setEditingId] = useState<number | undefined>(
    () => storage?.id,
  );
  const [type, setType] = useState(() => storage?.type ?? 'nas');
  const [rootPath, setRootPath] = useState(() => config.rootPath ?? '');
  const [alias, setAlias] = useState(() => config.alias ?? '');
  const [endpoint, setEndpoint] = useState(() => config.endpoint ?? '');
  const [bucket, setBucket] = useState(() => config.bucket ?? '');
  const [region, setRegion] = useState(() => config.region ?? '');
  const [accessKey, setAccessKey] = useState(() => config.accessKey ?? '');
  const [secretKey, setSecretKey] = useState(() => config.secretKey ?? '');
  const [prefix, setPrefix] = useState(() => config.prefix ?? '');
  const [isDisabled, setIsDisabled] = useState(() => config.isDisabled ?? false);
  const [message, setMessage] = useState<string | null>(null);

  const resetToCreate = () => {
    setEditingId(undefined);
    setType('nas');
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
        router.replace(`/dashboard/storage?storageId=${result.storageId}`);
      }
      router.refresh();
    });
  };

  const isLocal = type === 'local' || type === 'nas';

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {STORAGE_TYPES.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setType(item.value)}
            className={cn(
              'rounded-full border px-4 py-1 text-xs font-medium transition',
              type === item.value
                ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm'
                : 'border-zinc-200 bg-white/70 text-zinc-600 hover:border-indigo-300 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:border-indigo-500/60',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isLocal ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-zinc-800 dark:text-zinc-100">目录路径</Label>
            <Input
              value={rootPath}
              onChange={(event) => setRootPath(event.target.value)}
              placeholder="例如 /data/photos 或 D:\\Photos"
              className="border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              填写容器内或本机可访问的路径。
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-800 dark:text-zinc-100">
              显示名称（可选）
            </Label>
            <Input
              value={alias}
              onChange={(event) => setAlias(event.target.value)}
              placeholder="例如 工作室 NAS"
              className="border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60"
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-zinc-800 dark:text-zinc-100">Endpoint</Label>
            <Input
              value={endpoint}
              onChange={(event) => setEndpoint(event.target.value)}
              placeholder="https://s3.example.com"
              className="border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-800 dark:text-zinc-100">Bucket</Label>
            <Input
              value={bucket}
              onChange={(event) => setBucket(event.target.value)}
              placeholder="your-bucket"
              className="border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-800 dark:text-zinc-100">Region</Label>
            <Input
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              placeholder="ap-east-1"
              className="border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-800 dark:text-zinc-100">Access Key</Label>
            <Input
              value={accessKey}
              onChange={(event) => setAccessKey(event.target.value)}
              className="border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-800 dark:text-zinc-100">Secret Key</Label>
            <Input
              value={secretKey}
              onChange={(event) => setSecretKey(event.target.value)}
              className="border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-800 dark:text-zinc-100">前缀（可选）</Label>
            <Input
              value={prefix}
              onChange={(event) => setPrefix(event.target.value)}
              placeholder="photos/"
              className="border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60"
            />
          </div>
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
          暂停该存储的扫描与展示
        </label>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          启用前请确保路径或访问凭据有效。
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" aria-disabled={isPending}>
          {editingId ? '更新配置' : '保存配置'}
        </Button>
        <Button type="button" variant="ghost" onClick={resetToCreate}>
          新建配置
        </Button>
        {message ? (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
