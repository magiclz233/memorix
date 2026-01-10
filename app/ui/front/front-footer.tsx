import Link from 'next/link';
import { spaceGrotesk } from '@/app/ui/fonts';
import { cn } from '@/lib/utils';

const footerLinks = [
  { label: '首页', href: '/' },
  { label: '画廊', href: '/gallery' },
  { label: '照片作品集', href: '/photo-collections' },
  { label: '视频作品集', href: '/video-collections' },
  { label: '关于', href: '/about' },
];

export function FrontFooter() {
  return (
    <footer className='relative z-10 mt-16 border-t border-zinc-200 px-6 py-10 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400'>
      <div className='mx-auto flex w-[80vw] max-w-none flex-col gap-6 md:flex-row md:items-center md:justify-between'>
        <div className='space-y-2'>
          <p className={cn(spaceGrotesk.className, 'text-base text-zinc-900 dark:text-white')}>
            Lumina Archive
          </p>
          <p>用光线记录宇宙与城市的交汇。</p>
        </div>
        <div className='flex flex-wrap gap-4 text-xs uppercase tracking-[0.2em]'>
          {footerLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className='transition hover:text-zinc-900 dark:hover:text-white'
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
