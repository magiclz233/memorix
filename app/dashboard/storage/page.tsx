import Link from 'next/link';
import {
  Cloud,
  HardDrive,
  RefreshCw,
  Server,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';

import { headers } from 'next/headers';
import { auth } from '@/auth';
import { deleteUserStorage, scanStorage, setUserStorageDisabled } from '@/app/lib/actions';
import { fetchUserByEmail, fetchUserStorages } from '@/app/lib/data';
import { StorageConfigForm } from '@/app/ui/admin/storage-config-form';
import { SpotlightCard } from '@/components/ui/admin/spotlight-card';
import { Button } from '@/components/ui/button';

type StorageConfig = {
  rootPath?: string | null;
  alias?: string | null;
  endpoint?: string | null;
  bucket?: string | null;
  region?: string | null;
  isDisabled?: boolean;
};

type PageProps = {
  searchParams?: Promise<{
    storageId?: string;
  }>;
};

const STORAGE_META = {
  local: { label: '本地存储', icon: HardDrive },
  nas: { label: 'NAS 存储', icon: HardDrive },
  s3: { label: 'S3 存储', icon: Cloud },
  qiniu: { label: '七牛云', icon: Server },
} as const;

async function handleScan(formData: FormData) {
  'use server';
  const storageId = Number(formData.get('storageId'));
  if (!Number.isFinite(storageId)) return;
  await scanStorage(storageId);
}

async function handleDelete(formData: FormData) {
  'use server';
  const storageId = Number(formData.get('storageId'));
  if (!Number.isFinite(storageId)) return;
  await deleteUserStorage(storageId);
}

async function handleToggle(formData: FormData) {
  'use server';
  const storageId = Number(formData.get('storageId'));
  const disabled = formData.get('disabled') === 'true';
  if (!Number.isFinite(storageId)) return;
  await setUserStorageDisabled(storageId, disabled);
}

const renderStorageDetail = (type: string, config: StorageConfig) => {
  if (type === 'local' || type === 'nas') {
    return config.rootPath
      ? `路径：${config.rootPath}${config.alias ? ` · ${config.alias}` : ''}`
      : '尚未配置路径';
  }
  const bucket = config.bucket ? `Bucket：${config.bucket}` : '未配置 Bucket';
  const region = config.region ? `Region：${config.region}` : '未配置 Region';
  return `${bucket} · ${region}`;
};

export default async function Page({ searchParams }: PageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const email = session?.user?.email ?? null;

  if (!email) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          存储配置
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          请先登录后再管理存储配置。
        </p>
        <Button asChild variant="outline">
          <Link href="/login">前往登录</Link>
        </Button>
      </div>
    );
  }

  const user = await fetchUserByEmail(email);
  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          存储配置
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          未找到用户信息。
        </p>
      </div>
    );
  }

  const storages = await fetchUserStorages(user.id);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedId = Number(resolvedSearchParams?.storageId);
  const requestedStorage =
    Number.isFinite(requestedId) && requestedId > 0
      ? storages.find((item) => item.id === requestedId) ?? null
      : null;
  const fallbackStorage = storages[0] ?? null;
  const activeStorage = requestedStorage ?? fallbackStorage;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          存储配置
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          管理 NAS、S3 与七牛云连接，并执行扫描同步。
        </p>
      </header>

      <SpotlightCard className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {activeStorage ? '编辑当前存储' : '新增存储配置'}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              保存后会自动刷新存储列表。
            </p>
          </div>
          {activeStorage ? (
            <Button asChild variant="outline">
              <Link href="/dashboard/storage">新建配置</Link>
            </Button>
          ) : null}
        </div>
        <div className="mt-6">
          <StorageConfigForm storage={activeStorage} />
        </div>
      </SpotlightCard>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {storages.length === 0 ? (
          <SpotlightCard className="p-6">
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                暂无存储配置
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                请先在上方创建存储配置。
              </p>
            </div>
          </SpotlightCard>
        ) : (
          storages.map((storage) => {
            const config = (storage.config ?? {}) as StorageConfig;
            const disabled = Boolean(config.isDisabled);
            const meta =
              STORAGE_META[storage.type as keyof typeof STORAGE_META] ??
              STORAGE_META.local;
            const Icon = meta.icon;
            return (
              <SpotlightCard key={storage.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                        {meta.label}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {renderStorageDetail(storage.type, config)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        disabled ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                    />
                    {disabled ? '离线' : '在线'}
                  </div>
                </div>

                <div className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                  {config.endpoint ? `Endpoint：${config.endpoint}` : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/storage?storageId=${storage.id}`}>
                      编辑配置
                    </Link>
                  </Button>
                  <form action={handleScan}>
                    <input type="hidden" name="storageId" value={storage.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      disabled={storage.type === 's3' || storage.type === 'qiniu'}
                    >
                      <RefreshCw className="h-4 w-4" />
                      扫描文件
                    </Button>
                  </form>
                  <form action={handleToggle}>
                    <input type="hidden" name="storageId" value={storage.id} />
                    <input type="hidden" name="disabled" value={String(!disabled)} />
                    <Button type="submit" variant="ghost" size="sm">
                      {disabled ? (
                        <ToggleRight className="h-4 w-4" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                      {disabled ? '启用' : '停用'}
                    </Button>
                  </form>
                  <form action={handleDelete}>
                    <input type="hidden" name="storageId" value={storage.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                      删除
                    </Button>
                  </form>
                </div>
              </SpotlightCard>
            );
          })
        )}
      </div>
    </div>
  );
}
