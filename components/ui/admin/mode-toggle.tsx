'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'theme';

const applyTheme = (mode: ThemeMode) => {
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

const resolveInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
};

type ModeToggleProps = {
  className?: string;
};

export function ModeToggle({ className }: ModeToggleProps) {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initial = resolveInitialTheme();
    setMode(initial);
    applyTheme(initial);
    setReady(true);
  }, []);

  const toggleTheme = () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next);
  };

  if (!ready) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label="切换主题"
      className={cn(
        'h-8 w-8 rounded-full border-zinc-200 bg-white/70 text-zinc-700 shadow-sm hover:bg-white dark:border-zinc-700 dark:bg-black/40 dark:text-zinc-100 dark:hover:bg-zinc-800',
        className,
      )}
    >
      {mode === 'dark' ? <Sun /> : <Moon />}
    </Button>
  );
}
