'use client';

import { useTheme } from 'next-themes';
import { Toaster } from 'sonner';

export function AppToaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      position="top-right"
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      richColors
      toastOptions={{
        classNames: {
          toast:
            'group rounded-xl border border-zinc-200/80 bg-white/95 text-zinc-900 shadow-lg shadow-zinc-950/5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 dark:text-zinc-50',
          title: 'text-sm font-semibold',
          description: 'text-xs text-zinc-600 dark:text-zinc-300',
          actionButton:
            'bg-indigo-600 text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400',
          cancelButton:
            'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
        },
      }}
    />
  );
}
