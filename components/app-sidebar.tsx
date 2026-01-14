'use client';

import Link from 'next/link';
import {
  FolderKanban,
  HardDrive,
  Image,
  LayoutDashboard,
  LogOut,
  Settings,
  UploadCloud,
  User,
} from 'lucide-react';

import { signOutAction } from '@/app/lib/actions';
import { NavMain } from '@/components/nav-main';
import { ModeToggle } from '@/components/ui/admin/mode-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

const navItems = [
  { title: '概览', url: '/dashboard', icon: LayoutDashboard },
  { title: '资源库', url: '/dashboard/media', icon: Image },
  { title: '集合管理', url: '/dashboard/collections', icon: FolderKanban },
  { title: '上传中心', url: '/dashboard/upload', icon: UploadCloud },
  { title: '存储配置', url: '/dashboard/storage', icon: HardDrive },
  { title: '系统设置', url: '/dashboard/settings/system', icon: Settings },
  { title: '用户设置', url: '/dashboard/settings/profile', icon: User },
];

const ADMIN_USER = {
  name: '管理员',
  email: 'admin@memorix.dev',
  avatar: '/hero1.jpg',
};

export function AdminSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
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
                    Admin Console
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
      <SidebarSeparator />
      <SidebarFooter className="gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200/70 bg-white/70 p-2 text-zinc-900 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:text-zinc-100">
          <Avatar className="h-9 w-9 rounded-lg">
            <AvatarImage src={ADMIN_USER.avatar} alt={ADMIN_USER.name} />
            <AvatarFallback className="rounded-lg">
              {ADMIN_USER.name.slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{ADMIN_USER.name}</p>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {ADMIN_USER.email}
            </p>
          </div>
          <ModeToggle />
        </div>
        <form action={signOutAction}>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton type="submit" tooltip="退出登录">
                <LogOut />
                <span>退出登录</span>
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
