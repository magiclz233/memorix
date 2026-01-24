'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  FolderKanban,
  HardDrive,
  Image,
  LayoutDashboard,
  Home,
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
      {...props}
    >
      <SidebarHeader className="gap-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/dashboard">
                <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-500 text-white shadow-sm">
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
        <div className="flex items-center gap-2 p-2">
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarImage src={ADMIN_USER.avatar} alt={ADMIN_USER.name} />
            <AvatarFallback className="rounded-lg">
              {ADMIN_USER.name.slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{ADMIN_USER.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {ADMIN_USER.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LocaleSwitcher
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-input bg-background text-[10px] font-semibold text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground"
              itemClassName="rounded-sm px-2 py-1 text-sm transition hover:bg-accent hover:text-accent-foreground"
              activeItemClassName="bg-accent text-accent-foreground"
            />
            <ModeToggle className="h-8 w-8 rounded-lg border border-input bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground" />
          </div>
        </div>
        <SidebarMenu className="w-full flex-row gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1">
          <SidebarMenuItem className="flex-1">
            <SidebarMenuButton
              asChild
              tooltip={t('backToFront')}
              className="w-full justify-center"
            >
              <Link href="/">
                <Home />
                <span>{t('backToFront')}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem className="flex-1">
            <form action={signOutAction} className="w-full">
              <SidebarMenuButton
                type="submit"
                tooltip={t('signOut')}
                className="w-full justify-center"
              >
                <LogOut />
                <span>{t('signOut')}</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export const AppSidebar = AdminSidebar;
