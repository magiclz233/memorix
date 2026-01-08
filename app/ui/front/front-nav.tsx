import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { spaceGrotesk } from '@/app/ui/fonts';
import { cn } from '@/lib/utils';

const navItems = [
  { label: '首页', href: '/' },
  { label: '画廊', href: '/gallery' },
  { label: '照片作品集', href: '/photo-collections' },
  { label: '视频作品集', href: '/video-collections' },
  { label: '关于', href: '/about' },
];

export function FrontNav() {
  return (
    <div className='relative z-20 w-full px-6 pt-6'>
      <div className='mx-auto flex w-full max-w-6xl items-center justify-between rounded-full border border-slate-200/70 bg-white/70 px-4 py-2 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-none'>
        <Link href='/' className='flex items-center gap-2'>
          <span
            className={cn(
              spaceGrotesk.className,
              'text-lg font-semibold tracking-tight text-foreground'
            )}
          >
            Nebula Studio
          </span>
          <span className='hidden text-xs text-muted-foreground md:inline'>
            Visual Archive
          </span>
        </Link>
        <nav className='hidden items-center gap-6 text-sm text-muted-foreground lg:flex'>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className='transition hover:text-foreground'
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className='flex items-center gap-2'>
          <ThemeToggle className='static' />
          <Button
            asChild
            variant='secondary'
            className='rounded-full bg-foreground text-background hover:bg-foreground/90 dark:bg-white dark:text-slate-950'
          >
            <Link href='/dashboard'>进入后台</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
