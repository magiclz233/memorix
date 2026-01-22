'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  FolderKanban,
  HardDrive,
  Image,
  LayoutDashboard,
  LogOut,
  Settings,
  UploadCloud,
  Users,
} from 'lucide-react';

import { signOutAction } from '@/app/lib/actions';
import { NavMain } from '@/components/nav-main';
import { ModeToggle } from '@/components/ui/admin/mode-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LocaleSwitcher } from '@/components/locale-switcher';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar';

const ADMIN_USER = {
  name: 'Administrator',
  email: 'admin@memorix.com',
  avatar: '/hero1.jpg',
};

export function AdminSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations('dashboard.sidebar');

  const navItems = [
    { title: t('overview'), url: '/dashboard', icon: LayoutDashboard },
    { title: t('media'), url: '/dashboard/media', icon: Image },
    { title: t('collections'), url: '/dashboard/collections', icon: FolderKanban },
    { title: t('upload'), url: '/dashboard/upload', icon: UploadCloud },
    { title: t('storage'), url: '/dashboard/storage', icon: HardDrive },
    { title: t('systemSettings'), url: '/dashboard/settings/system', icon: Settings },
    { title: t('userManagement'), url: '/dashboard/settings/users', icon: Users },
  ];

  return (
    <Sidebar
      collapsible="icon"
      contentClassName="border-r border-zinc-200/70 bg-white/80 backdrop-blur-xl dark:border-zinc-800 dark:bg-black/40"
      {...props}
    >
      <SidebarHeader className="gap-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/dashboard">
                <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-sm">
                  <LayoutDashboard className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                    Memorix
                  </span>
                  <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {t('adminConsole')}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter className="gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200/70 bg-white/70 p-2 text-zinc-900 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:text-zinc-100">
          <Avatar className="h-9 w-9 rounded-full">
            <AvatarImage src={ADMIN_USER.avatar} alt={ADMIN_USER.name} />
            <AvatarFallback className="rounded-full">
              {ADMIN_USER.name.slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{ADMIN_USER.name}</p>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {ADMIN_USER.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LocaleSwitcher
              className="h-9 w-9 rounded-full border border-zinc-200/70 bg-white/80 text-[10px] font-semibold text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-black/40 dark:text-zinc-100"
              itemClassName="rounded-md px-2 py-1 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
              activeItemClassName="bg-zinc-100 text-zinc-900 dark:bg-white/15 dark:text-white"
            />
            <ModeToggle className="h-9 w-9" />
          </div>
        </div>
        <form action={signOutAction}>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton type="submit" tooltip={t('signOut')}>
                <LogOut />
                <span>{t('signOut')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </form>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export const AppSidebar = AdminSidebar;
