'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ThemeToggleProps = {
  className?: string;
};

export function ModeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mounted) return null;

  const resolvedTheme = theme === 'system' ? systemTheme : theme;
  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      type='button'
      variant='outline'
      size='icon'
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label='切换主题'
      className={cn(
        'h-9 w-9 rounded-full border-zinc-200 bg-white/70 text-zinc-700 shadow-sm hover:bg-white dark:border-white/10 dark:bg-black/50 dark:text-white dark:hover:bg-white/10',
        className
      )}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}

export const ThemeToggle = ModeToggle;
