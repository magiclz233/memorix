import Link from 'next/link';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { fetchHeroPhotoIdsByUser, fetchStorageFiles, fetchUserByEmail, fetchUserStorages } from '@/app/lib/data';
import { StorageConfigForm } from '@/app/ui/photos/storage-config';
import { StorageFilesManager } from '@/app/ui/photos/storage-files';
import { StorageListManager } from '@/app/ui/photos/storage-list';

type StorageConfig = {
  isDisabled?: boolean;
};

type PageProps = {
  searchParams?: Promise<{
    storageId?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const email = session?.user?.email ?? null;

  if (!email) {
    return (
      <main className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">照片配置</h1>
          <p className="text-base text-gray-500">请先登录后再配置存储。</p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          前往登录
        </Link>
      </main>
    );
  }

  const user = await fetchUserByEmail(email);
  if (!user) {
    return (
      <main className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">照片配置</h1>
          <p className="text-base text-gray-500">未找到用户信息。</p>
        </div>
      </main>
    );
  }

  const storages = await fetchUserStorages(user.id);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedId = Number(resolvedSearchParams?.storageId);
  const requestedStorage =
    Number.isFinite(requestedId) && requestedId > 0
      ? storages.find((item) => item.id === requestedId) ?? null
      : null;
  const fallbackStorage =
    storages.find((item) => !(item.config as StorageConfig)?.isDisabled) ??
    storages[0] ??
    null;
  const activeStorage = requestedStorage ?? fallbackStorage;
  const activeStorageId = activeStorage?.id;
  const isActiveDisabled = Boolean(
    activeStorage && (activeStorage.config as StorageConfig)?.isDisabled,
  );
  const files = activeStorageId ? await fetchStorageFiles(activeStorageId) : [];
  const heroIds = await fetchHeroPhotoIdsByUser(user.id);

  return (
    <main className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">照片配置</h1>
        <p className="text-base text-gray-500">
          选择存储类型并配置目录，扫描后勾选要在图库展示的图片。
        </p>
        <Link
          href="/gallery"
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          预览图库
        </Link>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <StorageConfigForm
          key={activeStorage?.id ?? 'new'}
          storage={activeStorage}
        />
      </div>

      {storages.length > 0 ? (
        <StorageListManager storages={storages} activeStorageId={activeStorageId} />
      ) : null}

      {activeStorage ? (
        <StorageFilesManager
          key={`${activeStorage.id}-${files.length}`}
          storageId={activeStorage.id}
          storageType={activeStorage.type}
          files={files}
          isDisabled={isActiveDisabled}
          heroIds={heroIds}
        />
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
          暂无存储配置，请先添加一个目录或存储。
        </div>
      )}
    </main>
  );
}
