'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';

type NavItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  exact?: boolean;
  items?: {
    title: string;
    url: string;
  }[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

const isUrlActive = (pathname: string, url: string, exact?: boolean) => {
  if (exact || url === '/dashboard') {
    return pathname === url;
  }
  return pathname === url || pathname.startsWith(`${url}/`);
};

export function NavMain({
  items,
  groups,
}: {
  items?: NavItem[];
  groups?: NavGroup[];
}) {
  const pathname = usePathname();
  const t = useTranslations('dashboard');

  const resolvedGroups: NavGroup[] =
    groups && groups.length > 0
      ? groups
      : [{ label: t('navigation'), items: items ?? [] }];

  return (
    <>
      {resolvedGroups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map((item) => {
              const hasSubItems = Boolean(item.items?.length);
              const isSubActive = item.items?.some((subItem) =>
                isUrlActive(pathname, subItem.url),
              );
              const isActive =
                isUrlActive(pathname, item.url, item.exact) || Boolean(isSubActive);

              if (!hasSubItems) {
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              }

              return (
                <Collapsible
                  key={item.url}
                  asChild
                  defaultOpen={isActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton isActive={isActive} tooltip={item.title}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => {
                          const isSubItemActive = isUrlActive(pathname, subItem.url);
                          return (
                            <SidebarMenuSubItem key={subItem.url}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isSubItemActive}
                              >
                                <Link href={subItem.url}>
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}
