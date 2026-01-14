import Link from 'next/link';
import { auth } from '@/auth';
import { fetchDashboardOverview, fetchUserByEmail } from '@/app/lib/data';

type StatCardProps = {
  label: string;
  value: number;
  description: string;
};

const StatCard = ({ label, value, description }: StatCardProps) => (
  <div className="rounded-xl border border-zinc-200/70 bg-white/80 p-4 shadow-sm">
    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{label}</p>
    <p className="mt-3 text-2xl font-semibold text-zinc-900">{value}</p>
    <p className="mt-2 text-sm text-zinc-500">{description}</p>
  </div>
);

export default async function Page() {
  const session = await auth();
  const email = session?.user?.email ?? null;

  if (!email) {
    return (
      <main className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">概览</h1>
          <p className="text-base text-zinc-500">请先登录后查看系统概览。</p>
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
          <h1 className="text-2xl font-semibold text-zinc-900">概览</h1>
          <p className="text-base text-zinc-500">未找到用户信息。</p>
        </div>
      </main>
    );
  }

  const overview = await fetchDashboardOverview(user.id);
  const stats = [
    {
      label: '存储源',
      value: overview.storageCount,
      description: '已连接的存储配置数量',
    },
    {
      label: '资源总数',
      value: overview.fileCount,
      description: '已索引的图片与视频数量',
    },
    {
      label: '已发布',
      value: overview.publishedCount,
      description: '当前前台可见的媒体数量',
    },
    {
      label: '图片合集',
      value: overview.photoCollectionsCount,
      description: '已创建的照片专题数量',
    },
    {
      label: '视频合集',
      value: overview.videoSeriesCount,
      description: '已创建的视频专题数量',
    },
  ];

  return (
    <main className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">概览</h1>
        <p className="text-base text-zinc-500">
          这里汇总 Memorix 当前的核心资源状态，方便快速检查与管理。
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">快捷入口</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/dashboard/photos"
            className="rounded-xl border border-zinc-200/70 bg-white/70 px-4 py-3 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:text-zinc-900"
          >
            照片配置与发布
          </Link>
          <Link
            href="/dashboard/storage"
            className="rounded-xl border border-zinc-200/70 bg-white/70 px-4 py-3 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:text-zinc-900"
          >
            存储连接管理
          </Link>
          <Link
            href="/gallery"
            className="rounded-xl border border-zinc-200/70 bg-white/70 px-4 py-3 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:text-zinc-900"
          >
            前台画廊预览
          </Link>
        </div>
      </section>
    </main>
  );
}
