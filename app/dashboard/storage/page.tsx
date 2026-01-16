import { headers } from 'next/headers';
import Link from 'next/link';
import { auth } from '@/auth';
import { fetchUserByEmail, fetchUserStorages } from '@/app/lib/data';
import { StorageView } from '@/app/ui/admin/storage/storage-view';
import { Button } from '@/components/ui/button';

export default async function Page() {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          存储配置
        </h1>
      </div>
      
      <StorageView storages={storages} />
    </div>
  );
}
