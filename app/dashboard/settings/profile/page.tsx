import { headers } from 'next/headers';
import { auth } from '@/auth';
import { fetchUserByEmail } from '@/app/lib/data';
import { ProfileForm } from '@/app/ui/dashboard/profile-form';
import { ChangePasswordForm } from '@/app/ui/shared/change-password-form';

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user?.email 
    ? await fetchUserByEmail(session.user.email) 
    : null;

  if (!user) {
    return <div>用户不存在</div>;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          用户设置
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          更新管理员资料与登录密码。                                                                            
        </p>
      </header>

      <div className="rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">基本资料</h2>
        <ProfileForm user={user} />
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">修改密码</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
