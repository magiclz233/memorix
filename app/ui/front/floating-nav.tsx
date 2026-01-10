'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, UserCircle } from 'lucide-react';
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

  return (
    <div className='fixed inset-x-0 top-6 z-50 flex justify-center px-6'>
      <div className='flex w-[80vw] max-w-none items-center justify-between rounded-full border border-zinc-200 bg-white/70 px-4 py-2 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-black/70'>
        <Link href='/' className='flex items-center gap-3'>
          <span
            className={cn(
              spaceGrotesk.className,
              'text-sm font-semibold tracking-[0.3em] text-zinc-900 dark:text-white'
            )}
          >
            LUMINA
          </span>
          <span className='hidden text-xs uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400 md:inline'>
            Archive
          </span>
        </Link>
        <nav className='hidden items-center gap-2 text-xs uppercase tracking-[0.2em] lg:flex'>
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-full px-3 py-2 transition',
                  active
                    ? 'bg-zinc-100 text-zinc-900 dark:bg-white/10 dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='h-9 w-9 rounded-full text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white'
            aria-label='搜索'
          >
            <Search className='h-4 w-4' />
          </Button>
          <ModeToggle className='h-9 w-9' />
          <Button
            asChild
            variant='outline'
            className='hidden rounded-full border-zinc-200 bg-white/80 text-xs uppercase tracking-[0.2em] text-zinc-700 shadow-sm hover:bg-white dark:border-white/10 dark:bg-black/60 dark:text-white sm:inline-flex'
          >
            <Link href='/login' className='flex items-center gap-2 px-2'>
              <UserCircle className='h-4 w-4' />
              登录
            </Link>
          </Button>
          <Button
            asChild
            variant='outline'
            size='icon'
            className='h-9 w-9 rounded-full border-zinc-200 bg-white/80 text-zinc-700 shadow-sm hover:bg-white dark:border-white/10 dark:bg-black/60 dark:text-white sm:hidden'
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
