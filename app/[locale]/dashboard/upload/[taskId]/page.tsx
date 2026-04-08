import { getTranslations } from 'next-intl/server';

import { TaskDetail } from '@/app/ui/admin/upload/task-detail';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default async function Page({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const t = await getTranslations('dashboard');
  const { taskId } = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t('upload.taskDetail.title')}
        </h1>
        <Button asChild variant="ghost">
          <Link href="/dashboard/upload">{t('upload.backToTasks')}</Link>
        </Button>
      </div>

      <TaskDetail taskId={taskId} />
    </div>
  );
}