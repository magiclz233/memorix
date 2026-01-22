'use client';

import { AdminSidebar } from '@/components/app-sidebar';
import { DotBackground } from '@/components/ui/admin/dot-background';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useTranslations } from 'next-intl';

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('dashboard.shell');
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset className="relative overflow-hidden">
        <DotBackground />
        <header className="relative z-10 flex h-14 shrink-0 items-center gap-2 border-b border-zinc-200/70 bg-white/70 px-4 backdrop-blur dark:border-zinc-800/70 dark:bg-black/40">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
            {t('title')}
          </span>
        </header>
        <div className="relative z-10 flex-1 p-6 md:overflow-y-auto md:p-10">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
