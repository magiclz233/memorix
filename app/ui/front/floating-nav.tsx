'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserCircle } from 'lucide-react';
import { spaceGrotesk } from '@/app/ui/fonts';
import { ModeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { label: '首页', href: '/' },
  { label: '画廊', href: '/gallery' },
  { label: '图集', href: '/photo-collections' },
  { label: '视频集', href: '/video-collections' },
  { label: '关于', href: '/about' },
];

export function FloatingNav() {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <div className='fixed inset-x-0 top-0 z-50 pointer-events-none'>
      <div className='flex items-center justify-between px-6 pt-6'>
        <Link href='/' className='pointer-events-auto flex items-center gap-3'>
          <span
            className={cn(
              spaceGrotesk.className,
              'text-base font-semibold tracking-[0.35em] md:text-lg',
              isHome ? 'text-white/80' : 'text-zinc-800/90 dark:text-white/85',
            )}
          >
            LUMINA
          </span>
        </Link>
        <div className='pointer-events-auto flex items-center gap-2'>
          <nav
            className={cn(
              'hidden items-center gap-4 text-xs uppercase tracking-[0.2em] lg:flex',
              isHome ? 'text-white/60' : 'text-zinc-600/80 dark:text-white/60',
            )}
          >
            {navItems.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== '/' && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'transition',
                    active
                      ? isHome
                        ? 'text-white'
                        : 'text-zinc-900 dark:text-white'
                      : isHome
                        ? 'hover:text-white'
                        : 'hover:text-zinc-900 dark:hover:text-white',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <ModeToggle
            className={cn(
              'h-9 w-9 border shadow-sm backdrop-blur-xl',
              isHome
                ? 'border-white/30 bg-white/10 text-white hover:bg-white/20'
                : 'border-zinc-200/70 bg-white/80 text-zinc-800 hover:bg-white dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20',
            )}
          />
          <Button
            asChild
            variant='outline'
            className={cn(
              'hidden rounded-full text-xs uppercase tracking-[0.2em] shadow-sm sm:inline-flex',
              isHome
                ? 'border-white/30 bg-white/10 text-white hover:bg-white/20'
                : 'border-zinc-200/70 bg-white/80 text-zinc-700 hover:bg-white dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20',
            )}
          >
            <Link href='/login' className='flex items-center gap-2 px-3'>
              <UserCircle className='h-4 w-4' />
              登录
            </Link>
          </Button>
          <Button
            asChild
            variant='outline'
            size='icon'
            className={cn(
              'h-9 w-9 rounded-full shadow-sm sm:hidden',
              isHome
                ? 'border-white/30 bg-white/10 text-white hover:bg-white/20'
                : 'border-zinc-200/70 bg-white/80 text-zinc-700 hover:bg-white dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20',
            )}
          >
            <Link href='/login' aria-label='登录'>
              <UserCircle className='h-4 w-4' />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
