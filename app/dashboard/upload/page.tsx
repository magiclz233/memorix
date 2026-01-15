import Link from 'next/link';

import { headers } from 'next/headers';
import { auth } from '@/auth';
import { fetchUserByEmail, fetchUserStorages } from '@/app/lib/data';
import { UploadCenter } from '@/app/ui/admin/upload-center';
import { Button } from '@/components/ui/button';

type StorageConfig = {
  rootPath?: string | null;
  alias?: string | null;
  endpoint?: string | null;
  bucket?: string | null;
  region?: string | null;
};

const buildStorageOption = (storage: {
  id: number;
  type: string;
  config: unknown;
}) => {
  const config = (storage.config ?? {}) as StorageConfig;
  const labelMap: Record<string, string> = {
    local: '本地存储',
    nas: 'NAS',
    s3: 'S3',
    qiniu: '七牛云',
  };
  const label = labelMap[storage.type] ?? '存储';
  const name =
    config.alias ||
    config.bucket ||
    config.rootPath ||
    config.endpoint ||
    '未命名';
  const description =
    storage.type === 'local' || storage.type === 'nas'
      ? config.rootPath ?? '未配置路径'
      : config.endpoint ?? config.region ?? '未配置连接信息';
  return {
    id: storage.id,
    label: `${label} · ${name}`,
    description,
  };
};

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const email = session?.user?.email ?? null;

  if (!email) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          上传中心
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          请先登录后再进行上传操作。
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
          上传中心
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          未找到用户信息。
        </p>
      </div>
    );
  }

  const storages = await fetchUserStorages(user.id);
  const options = storages.map(buildStorageOption);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          上传中心
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          选择目标存储后拖拽上传，系统会提供进度反馈。
        </p>
      </header>
      <UploadCenter storages={options} />
    </div>
  );
}
