import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Page() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          系统设置
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          管理站点名称、SEO 描述与公共访问权限。
        </p>
      </header>

      <div className="rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <form className="space-y-5">
          <div className="space-y-2">
            <Label className="text-zinc-800 dark:text-zinc-100">站点名称</Label>
            <Input
              placeholder="Memorix Studio"
              className="border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-800 dark:text-zinc-100">SEO 描述</Label>
            <textarea
              rows={4}
              placeholder="填写站点的核心关键词与简介，用于搜索展示。"
              className="w-full rounded-md border border-zinc-200 bg-white/70 px-3 py-2 text-sm text-zinc-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-zinc-200 bg-white/60 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-700"
                defaultChecked
              />
              开启公共访问权限
            </label>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              关闭后访客将无法浏览前台画廊。
            </span>
          </div>

          <Button type="submit">保存设置</Button>
        </form>
      </div>
    </div>
  );
}
