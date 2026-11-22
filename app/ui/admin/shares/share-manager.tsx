'use client';

import { useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Check,
  Clock,
  Copy,
  Eye,
  Link2,
  Loader2,
  Lock,
  Plus,
  ShieldAlert,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { showError, showSuccess } from '@/app/lib/toast-utils';
import { cn } from '@/lib/utils';
import { ListTabs } from '@/app/ui/shared/list-tabs';
import { ListPagination } from '@/app/ui/shared/list-pagination';
import { useListPagination } from '@/app/ui/shared/use-list-pagination';

type ShareRow = {
  id: number;
  token: string;
  name: string | null;
  fileCount: number;
  hasPassword: boolean;
  expiresAt: string | null;
  role: string;
  allowDownload: boolean;
  viewCount: number;
  createdAt: string;
};

type SelectableMedia = {
  id: number;
  title: string | null;
  path: string;
  mediaType: string | null;
  thumbUrl: string | null;
  isPublished: boolean | null;
};

type Props = {
  initialShares: ShareRow[];
  selectableMedia: SelectableMedia[];
  now: number;
};

export function ShareManager({ initialShares, selectableMedia, now }: Props) {
  // 分享管理文案在 messages 的 front.share.admin 下（历史结构），管理端复用同一组文案。
  const t = useTranslations('front.share.admin');
  const tList = useTranslations('common.list');
  const router = useRouter();
  const [shares, setShares] = useState(initialShares);
  const [shareFilter, setShareFilter] = useState<
    'all' | 'active' | 'expired' | 'protected'
  >('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [expiry, setExpiry] = useState('never');
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
  const [allowDownload, setAllowDownload] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sortedMedia = useMemo(
    () =>
      [...selectableMedia].sort(
        (a, b) => Number(b.isPublished) - Number(a.isPublished),
      ),
    [selectableMedia],
  );

  const filteredShares = useMemo(() => {
    return shares.filter((share) => {
      const expired = share.expiresAt
        ? new Date(share.expiresAt).getTime() <= now
        : false;

      if (shareFilter === 'active') return !expired;
      if (shareFilter === 'expired') return expired;
      if (shareFilter === 'protected') return share.hasPassword;
      return true;
    });
  }, [shares, shareFilter, now]);

  const pagination = useListPagination(filteredShares.length);
  const pagedShares = pagination.slice(filteredShares);

  const handleShareFilterChange = (value: string) => {
    setShareFilter(value as 'all' | 'active' | 'expired' | 'protected');
    pagination.setPage(1);
  };

  function toggleFile(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function closeDialog() {
    setDialogOpen(false);
    setSelected(new Set());
    setName('');
    setPassword('');
    setExpiry('never');
    setRole('viewer');
    setAllowDownload(true);
  }

  async function create() {
    if (creating) return;
    if (selected.size === 0) {
      showError(t('selectFiles'));
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileIds: Array.from(selected),
          name: name.trim() || undefined,
          password: password || undefined,
          expiresInDays: expiry === 'never' ? undefined : Number(expiry),
          role,
          allowDownload: role === 'editor' ? true : allowDownload,
        }),
      });
      if (!res.ok) {
        showError(t('createFailed'));
        setCreating(false);
        return;
      }
      showSuccess(t('createSuccess'));
      closeDialog();
      startTransition(() => router.refresh());
      // 用服务端最新数据刷新本地列表
      const list = await fetch('/api/shares', { cache: 'no-store' }).then((r) => r.json());
      if (Array.isArray(list.shares)) setShares(list.shares);
    } catch {
      showError(t('createFailed'));
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: number) {
    if (!window.confirm(t('revokeConfirm'))) return;
    setRevokingId(id);
    try {
      const res = await fetch(`/api/shares/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('revoke failed');
      setShares((prev) => prev.filter((s) => s.id !== id));
      showSuccess(t('revokeSuccess'));
      startTransition(() => router.refresh());
    } catch {
      showError(t('revokeFailed'));
    } finally {
      setRevokingId(null);
    }
  }

  async function copyLink(token: string) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/share/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      window.setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      showError(url);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="flex gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {t('warningTitle')}
            </p>
            <p className="text-xs text-amber-700/90 dark:text-amber-400/80">
              {t('warningBody')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('newShare')}
        </Button>
      </div>

      {shares.length > 0 ? (
        <ListTabs
          size='sm'
          items={[
            { value: 'all', label: tList('shareAll'), count: shares.length },
            {
              value: 'active',
              label: tList('shareActive'),
              count: shares.filter(
                (share) =>
                  !share.expiresAt ||
                  new Date(share.expiresAt).getTime() > now,
              ).length,
            },
            {
              value: 'expired',
              label: tList('shareExpired'),
              count: shares.filter(
                (share) =>
                  Boolean(share.expiresAt) &&
                  new Date(share.expiresAt as string).getTime() <= now,
              ).length,
            },
            {
              value: 'protected',
              label: tList('shareProtected'),
              count: shares.filter((share) => share.hasPassword).length,
            },
          ]}
          value={shareFilter}
          onChange={handleShareFilterChange}
          ariaLabel={tList('filterLabel')}
        />
      ) : null}

      {shares.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {t('noShares')}
        </div>
      ) : filteredShares.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {tList('noMatches')}
        </div>
      ) : (
        <div className="space-y-3">
          {pagedShares.map((share) => {
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const url = `${origin}/share/${share.token}`;
            return (
              <div
                key={share.id}
                className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 shrink-0 text-indigo-500" />
                    <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                      {share.name || url}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>{t('selectedCount', { count: share.fileCount })}</span>
                    <span className="inline-flex items-center gap-1">
                      {share.hasPassword ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                      {share.hasPassword ? t('hasPassword') : t('noPassword')}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {t('views', { count: share.viewCount })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {share.expiresAt
                        ? t('expiresAt', {
                            date: new Date(share.expiresAt).toLocaleDateString(),
                          })
                        : t('neverExpires')}
                    </span>
                    <span>{share.role === 'editor' ? t('roleEditor') : t('roleViewer')}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyLink(share.token)}>
                    {copiedToken === share.token ? (
                      <Check className="mr-1.5 h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="mr-1.5 h-4 w-4" />
                    )}
                    {copiedToken === share.token ? t('copied') : t('copyLink')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => revoke(share.id)}
                    disabled={revokingId === share.id}
                  >
                    {revokingId === share.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredShares.length > 0 ? (
        <ListPagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          totalCount={filteredShares.length}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
        />
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('formTitle')}</DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label>{t('selectFiles')} · {t('selectedCount', { count: selected.size })}</Label>
              {sortedMedia.length === 0 ? (
                <p className="text-sm text-zinc-500">{t('noFiles')}</p>
              ) : (
                <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto rounded-lg border border-zinc-200 p-2 dark:border-zinc-800 sm:grid-cols-5">
                  {sortedMedia.map((media) => {
                    const isSelected = selected.has(media.id);
                    return (
                      <button
                        key={media.id}
                        type="button"
                        onClick={() => toggleFile(media.id)}
                        title={media.title || media.path}
                        className={cn(
                          'relative aspect-square overflow-hidden rounded-md border-2 transition',
                          isSelected
                            ? 'border-indigo-500'
                            : 'border-transparent hover:border-zinc-300 dark:hover:border-zinc-600',
                        )}
                      >
                        {media.thumbUrl || media.mediaType === 'image' ? (
                          <Image
                            src={`/api/media/thumb/${media.id}`}
                            alt={media.title || media.path}
                            fill
                            sizes="120px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex h-full items-center justify-center bg-zinc-100 text-xs text-zinc-500 dark:bg-zinc-800">
                            #{media.id}
                          </span>
                        )}
                        {!media.isPublished ? (
                          <span className="absolute bottom-0 left-0 rounded-tr bg-black/60 px-1 text-[9px] text-white">
                            private
                          </span>
                        ) : null}
                        {isSelected ? (
                          <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white">
                            <Check className="h-3 w-3" />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="share-name">{t('nameLabel')}</Label>
                <Input
                  id="share-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('namePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="share-password">{t('passwordLabel')}</Label>
                <Input
                  id="share-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('passwordPlaceholder')}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('expiryLabel')}</Label>
                <Select value={expiry} onValueChange={setExpiry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">{t('expiryNever')}</SelectItem>
                    <SelectItem value="1">{t('expiryDays', { days: 1 })}</SelectItem>
                    <SelectItem value="7">{t('expiryDays', { days: 7 })}</SelectItem>
                    <SelectItem value="30">{t('expiryDays', { days: 30 })}</SelectItem>
                    <SelectItem value="90">{t('expiryDays', { days: 90 })}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('roleLabel')}</Label>
                <Select value={role} onValueChange={(v) => setRole(v as 'viewer' | 'editor')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">{t('roleViewer')}</SelectItem>
                    <SelectItem value="editor">{t('roleEditor')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {role === 'viewer' ? (
              <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <Label>{t('allowDownload')}</Label>
                <Switch checked={allowDownload} onCheckedChange={setAllowDownload} />
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={closeDialog}>
                <X className="mr-1.5 h-4 w-4" />
                {t('cancel')}
              </Button>
              <Button onClick={create} disabled={creating || selected.size === 0}>
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                {creating ? t('creating') : t('create')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
