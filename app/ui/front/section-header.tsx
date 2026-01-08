import Link from 'next/link';
import { spaceGrotesk } from '@/app/ui/fonts';
import { cn } from '@/lib/utils';

type SectionHeaderProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
};

export function SectionHeader({
  title,
  description,
  actionLabel,
  actionHref,
}: SectionHeaderProps) {
  return (
    <div className='flex flex-wrap items-end justify-between gap-4'>
      <div className='space-y-2'>
        <h2
          className={cn(
            spaceGrotesk.className,
            'text-2xl font-semibold text-foreground md:text-3xl'
          )}
        >
          {title}
        </h2>
        {description ? (
          <p className='max-w-2xl text-sm text-muted-foreground'>
            {description}
          </p>
        ) : null}
      </div>
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className='text-xs uppercase tracking-[0.3em] text-muted-foreground transition hover:text-foreground'
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
