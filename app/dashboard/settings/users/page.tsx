import { headers } from 'next/headers';
import { auth } from '@/auth';
import { fetchUsers } from '@/app/lib/data';
import { setUserRole } from '@/app/lib/actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const formatDate = (value?: Date | null) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
};

export default async function Page() {
  const requestHeaders = await headers();
  const [session, users] = await Promise.all([
    auth.api.getSession({ headers: requestHeaders }),
    fetchUsers(),
  ]);
  const currentUserId = session?.user?.id ? Number(session.user.id) : null;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          用户管理
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          管理用户角色，仅管理员可访问此页面。
        </p>
      </header>

      <div className="rounded-2xl border border-zinc-200 bg-white/80 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        {users.length === 0 ? (
          <div className="p-6 text-sm text-zinc-500 dark:text-zinc-400">
            暂无用户数据。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-3">用户</th>
                  <th className="px-6 py-3">角色</th>
                  <th className="px-6 py-3">注册时间</th>
                  <th className="px-6 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {users.map((user) => {
                  const role = user.role ?? 'user';
                  const isSelf = currentUserId !== null && currentUserId === user.id;
                  const isSelfAdmin = isSelf && role === 'admin';
                  const nextRole = role === 'admin' ? 'user' : 'admin';
                  const roleLabel = role === 'admin' ? '管理员' : '普通用户';

                  return (
                    <tr
                      key={user.id}
                      className="bg-white/60 text-zinc-700 hover:bg-white dark:bg-transparent dark:text-zinc-200 dark:hover:bg-zinc-900/40"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {user.name || user.email}
                          </span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {user.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                            role === 'admin'
                              ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200'
                              : 'border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300',
                          )}
                        >
                          {roleLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <form action={async (formData) => { await setUserRole(formData); }}>
                          <input type="hidden" name="userId" value={user.id} />
                          <input type="hidden" name="role" value={nextRole} />
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isSelfAdmin}
                            title={isSelfAdmin ? '当前账号不可降级' : undefined}
                          >
                            {role === 'admin' ? '设为普通用户' : '设为管理员'}
                          </Button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
