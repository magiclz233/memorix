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
import { usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import React from 'react';

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const t = useTranslations('dashboard.shell');
  const tSidebar = useTranslations('dashboard.sidebar');
  
  // Generate breadcrumbs from pathname
  // Example: /dashboard/media -> ['dashboard', 'media']
  // Filter out locale if present (usePathname usually handles this in next-intl)
  const segments = pathname.split('/').filter(Boolean);
  
  // Helper to capitalize
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
      case 'storage':
        return tSidebar('storage');
      case 'system':
        return tSidebar('systemSettings');
      case 'users':
        return tSidebar('userManagement');
      default:
        return capitalize(segment);
    }
  };

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {segments.map((segment, index) => {
                const isLast = index === segments.length - 1;
                const href = `/${segments.slice(0, index + 1).join('/')}`;
                
                const title = getBreadcrumbTitle(segment);

                return (
                  <React.Fragment key={href}>
                    <BreadcrumbItem className="hidden md:block">
                      {isLast ? (
                        <BreadcrumbPage>{title}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={href}>
                          {title}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!isLast && <BreadcrumbSeparator className="hidden md:block" />}
                  </React.Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min p-4">
             {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
