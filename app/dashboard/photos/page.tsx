import Link from 'next/link';
import { auth } from '@/auth';
import { fetchStorageFiles, fetchUserByEmail, fetchUserStorages } from '@/app/lib/data';
import { StorageConfigForm } from '@/app/ui/photos/storage-config';
import { StorageFilesManager } from '@/app/ui/photos/storage-files';

type PageProps = {
  searchParams?: {
    storageId?: string;
  };
};

export default async function Page({ searchParams }: PageProps) {
  const session = await auth();
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
  const requestedId = Number(searchParams?.storageId);
  const activeStorageId =
    Number.isFinite(requestedId) && requestedId > 0
      ? requestedId
      : storages[0]?.id;
  const activeStorage = storages.find((item) => item.id === activeStorageId) ?? null;
  const files = activeStorageId ? await fetchStorageFiles(activeStorageId) : [];

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

      {storages.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">存储列表</h2>
              <p className="text-sm text-gray-500">
                点击切换要管理的存储配置。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {storages.map((storage) => {
                const isActive = storage.id === activeStorageId;
                const rootPath = (storage.config as { rootPath?: string })?.rootPath;
                return (
                  <Link
                    key={storage.id}
                    href={`/dashboard/photos?storageId=${storage.id}`}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      isActive
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    {storage.type.toUpperCase()}
                    {rootPath ? ` · ${rootPath}` : ''}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeStorage ? (
        <StorageFilesManager
          key={`${activeStorage.id}-${files.length}`}
          storageId={activeStorage.id}
          storageType={activeStorage.type}
          files={files}
        />
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
          暂无存储配置，请先添加一个目录或存储。
        </div>
      )}
    </main>
  );
}
