'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = { token: string };

export function SharePasswordGate({ token }: Props) {
  const t = useTranslations('front.share.page');
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const res = await fetch(`/api/shares/${token}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError(t('wrongPassword'));
        setPending(false);
        return;
      }
      // cookie 已写入，刷新服务端组件以拿到解锁后的相册
      router.refresh();
    } catch {
      setError(t('wrongPassword'));
      setPending(false);
    }
  }

  return (
    <div className="front-fade-up mx-auto flex max-w-md flex-col items-center gap-6 rounded-3xl border border-zinc-200 bg-white/70 p-10 text-center backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/70">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
        <Lock className="h-6 w-6 text-zinc-600 dark:text-zinc-300" />
      </div>
      <div className="space-y-2">
        <h2 className="font-serif text-2xl font-semibold text-zinc-800 dark:text-white/90">
          {t('passwordTitle')}
        </h2>
        <p className="text-sm text-zinc-600/80 dark:text-white/60">
          {t('passwordDescription')}
        </p>
      </div>
      <form onSubmit={submit} className="flex w-full flex-col gap-3">
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('passwordPlaceholder')}
          aria-label={t('passwordPlaceholder')}
          autoFocus
          className="h-11 rounded-full border-zinc-200 bg-white/80 px-5 text-center dark:border-zinc-800 dark:bg-zinc-900/80"
        />
        {error ? <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
        <Button type="submit" disabled={pending} className="h-11 rounded-full">
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('unlocking')}
            </>
          ) : (
            t('unlockButton')
          )}
        </Button>
      </form>
    </div>
  );
}
