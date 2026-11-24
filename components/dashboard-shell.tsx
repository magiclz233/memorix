'use client';

import { AdminSidebar } from '@/components/app-sidebar';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Link, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import React from 'react';

type DashboardShellUser = {
  name: string;
  email: string;
  avatar?: string | null;
};

// 这些中间路由段本身没有独立列表页，面包屑只显示不可点击文本避免 404
const NON_LINKABLE_SEGMENTS = new Set(['settings']);

export default function DashboardShell({
  children,
  user,
  siteName = 'Memorix',
}: {
  children: React.ReactNode;
  user?: DashboardShellUser | null;
  siteName?: string;
}) {
  const pathname = usePathname();
  const tSidebar = useTranslations('dashboard.sidebar');

  const segments = pathname.split('/').filter(Boolean);
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const getBreadcrumbTitle = (segment: string) => {
    switch (segment) {
      case 'dashboard':
        return tSidebar('overview');
      case 'media':
        return tSidebar('media');
      case 'collections':
        return tSidebar('collections');
      case 'upload':
        return tSidebar('upload');
      case 'create':
        return tSidebar('createTask');
      case 'storage':
        return tSidebar('storage');
      case 'shares':
        return tSidebar('shares');
      case 'trash':
        return tSidebar('trash');
      case 'dedup':
        return tSidebar('dedup');
      case 'monitoring':
        return tSidebar('monitoring');
      case 'settings':
        return tSidebar('groups.system');
      case 'profile':
        return tSidebar('profile');
      case 'system':
        return tSidebar('systemSettings');
      case 'users':
        return tSidebar('userManagement');
      default:
        return /^\d+$/.test(segment) ? `#${segment}` : capitalize(segment);
    }
  };

  const currentTitle =
    segments.length > 0
      ? getBreadcrumbTitle(segments[segments.length - 1])
      : tSidebar('overview');

  return (
    <SidebarProvider>
      <AdminSidebar user={user} siteName={siteName} />
      <SidebarInset className="bg-zinc-50/60 dark:bg-zinc-950">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-zinc-200/80 bg-white/80 px-4 backdrop-blur-xl transition-[width,height] ease-linear dark:border-zinc-800/80 dark:bg-zinc-950/80 group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100 md:hidden">
            {currentTitle}
          </span>
          <Breadcrumb className="hidden md:block">
            <BreadcrumbList>
              {segments.map((segment, index) => {
                const isLast = index === segments.length - 1;
                const href = `/${segments.slice(0, index + 1).join('/')}`;
                const title = getBreadcrumbTitle(segment);
                const nonLinkable = NON_LINKABLE_SEGMENTS.has(segment);

                return (
                  <React.Fragment key={href}>
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage>{title}</BreadcrumbPage>
                      ) : nonLinkable ? (
                        <span className="text-muted-foreground">{title}</span>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link href={href}>{title}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!isLast && <BreadcrumbSeparator />}
                  </React.Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col px-4 py-5 md:px-8 md:py-6">
          <div className="mx-auto w-full max-w-[1600px] flex-1">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
