'use client';

import { useState, useTransition } from 'react';
import { Copy, Check, FolderPlus, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { addMediaToCollection } from '@/app/lib/actions/unified-collections';
import { showErrorToast, showSuccessToast } from '@/app/lib/batch-operations';

export type CollectionOption = {
  id: number;
  title: string;
  type: 'mixed' | 'photo' | 'video';
};

type AddToCollectionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileIds: number[];
  collections: CollectionOption[];
  onSuccess: () => void;
};

export function AddToCollectionDialog({
  open,
  onOpenChange,
  fileIds,
  collections,
  onSuccess,
}: AddToCollectionDialogProps) {
  const t = useTranslations('dashboard.media');
  const [collectionId, setCollectionId] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    const id = Number(collectionId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      showErrorToast(t('library.selectCollectionRequired'));
      return;
    }

    startTransition(async () => {
      try {
        const result = await addMediaToCollection(id, fileIds);
        if (result && 'message' in result && result.message) {
          showErrorToast(result.message);
          return;
        }
        showSuccessToast(t('library.addToCollectionSuccess', { count: fileIds.length }));
        setCollectionId('');
        onOpenChange(false);
        onSuccess();
      } catch {
        showErrorToast(t('library.addToCollectionFailed'));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-4 w-4 text-indigo-500" />
            {t('library.addToCollectionTitle', { count: fileIds.length })}
          </DialogTitle>
          <DialogDescription>{t('library.addToCollectionDesc')}</DialogDescription>
        </DialogHeader>

        {collections.length === 0 ? (
          <p className="py-4 text-sm text-zinc-500 dark:text-zinc-400">
            {t('library.noCollectionsAvailable')}
          </p>
        ) : (
          <div className="space-y-2 py-2">
            <Label>{t('library.targetCollection')}</Label>
            <Select value={collectionId} onValueChange={setCollectionId}>
              <SelectTrigger>
                <SelectValue placeholder={t('library.selectCollectionPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {collections.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t('library.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || collections.length === 0 || !collectionId}
            className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            {t('library.confirmAddToCollection')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type QuickShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileIds: number[];
  onSuccess: () => void;
};

export function QuickShareDialog({
  open,
  onOpenChange,
  fileIds,
  onSuccess,
}: QuickShareDialogProps) {
  const t = useTranslations('dashboard.media');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<string>('7');
  const [allowDownload, setAllowDownload] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resetAndClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setName('');
      setPassword('');
      setExpiresInDays('7');
      setAllowDownload(true);
      setCreatedUrl(null);
      setCopied(false);
    }
    onOpenChange(nextOpen);
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          fileIds,
          password: password.trim() || undefined,
          expiresInDays: expiresInDays === 'never' ? null : Number(expiresInDays),
          role: allowDownload ? 'editor' : 'viewer',
          allowDownload,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.share?.token) {
        showErrorToast(data?.error || t('library.shareFailed'));
        return;
      }

      const shareUrl = `${window.location.origin}/share/${data.share.token}`;
      setCreatedUrl(shareUrl);
      await navigator.clipboard?.writeText(shareUrl).catch(() => {});
      setCopied(true);
      showSuccessToast(t('library.shareCreatedCopied'));
      onSuccess();
    } catch {
      showErrorToast(t('library.shareFailed'));
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!createdUrl) return;
    await navigator.clipboard?.writeText(createdUrl).catch(() => {});
    setCopied(true);
    showSuccessToast(t('library.linkCopied'));
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-indigo-500" />
            {t('library.quickShareTitle', { count: fileIds.length })}
          </DialogTitle>
          <DialogDescription>{t('library.quickShareDesc')}</DialogDescription>
        </DialogHeader>

        {createdUrl ? (
          <div className="space-y-3 py-2">
            <Label>{t('library.shareLinkLabel')}</Label>
            <div className="flex items-center gap-2">
              <Input value={createdUrl} readOnly className="font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('library.shareName')}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('library.shareNamePlaceholder')}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t('library.shareExpires')}</Label>
                <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1d</SelectItem>
                    <SelectItem value="7">7d</SelectItem>
                    <SelectItem value="30">30d</SelectItem>
                    <SelectItem value="90">90d</SelectItem>
                    <SelectItem value="never">{t('library.shareNeverExpire')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t('library.sharePassword')}</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('library.sharePasswordPlaceholder')}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
              <Label htmlFor="quick-share-download" className="cursor-pointer text-sm">
                {t('library.shareAllowDownload')}
              </Label>
              <Switch
                id="quick-share-download"
                checked={allowDownload}
                onCheckedChange={setAllowDownload}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={() => resetAndClose(false)}>
            {createdUrl ? t('library.done') : t('library.cancel')}
          </Button>
          {!createdUrl ? (
            <Button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              {creating ? t('library.bulkUpdating') : t('library.createShareLink')}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
