import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Page() {
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
        <form className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-zinc-800 dark:text-zinc-100">姓名</Label>
              <Input
                placeholder="管理员"
                className="border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-800 dark:text-zinc-100">邮箱</Label>
              <Input
                type="email"
                placeholder="admin@memorix.dev"
                className="border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-zinc-800 dark:text-zinc-100">新密码</Label>
              <Input
                type="password"
                placeholder="请输入新密码"
                className="border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-800 dark:text-zinc-100">确认密码</Label>
              <Input
                type="password"
                placeholder="再次输入密码"
                className="border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60"
              />
            </div>
          </div>

          <Button type="submit">保存资料</Button>
        </form>
      </div>
    </div>
  );
}
