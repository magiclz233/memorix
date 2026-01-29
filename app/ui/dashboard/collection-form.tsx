'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  createCollection,
  createVideoSeries,
  updateCollection,
  updateVideoSeries,
} from '@/app/lib/actions/collections';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MediaPicker } from '@/app/ui/dashboard/media-picker';

export type CollectionFormData = {
  id?: number;
  title: string;
  description?: string;
  coverImage?: string;
};

type CollectionFormProps = {
  type: 'photo' | 'video';
  initialData?: CollectionFormData | null;
  onSuccess: () => void;
  onCancel: () => void;
};

export function CollectionForm({
  type,
  initialData,
  onSuccess,
  onCancel,
}: CollectionFormProps) {
  const t = useTranslations('dashboard.collections.form');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState(initialData?.coverImage ?? '');
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      let result;
      if (type === 'photo') {
        if (initialData?.id) {
          result = await updateCollection(initialData.id, formData);
        } else {
          result = await createCollection(formData);
        }
      } else {
        if (initialData?.id) {
          result = await updateVideoSeries(initialData.id, formData);
        } else {
          result = await createVideoSeries(formData);
        }
      }

      if (result?.message) {
        setError(result.message);
      } else {
        onSuccess();
      }
    });
  };

  const handleCoverSelect = (
    selectedItems: {
      id: number;
      thumbUrl: string | null;
      url: string | null;
      mediaType: 'image' | 'video' | 'animated';
    }[],
  ) => {
    const selected = selectedItems[0];
    if (!selected) {
      setIsPickerOpen(false);
      return;
    }
    const nextCover =
      selected.mediaType === 'video'
        ? selected.thumbUrl || `/api/media/thumb/${selected.id}`
        : selected.url || selected.thumbUrl || `/api/media/thumb/${selected.id}`;
    setCoverImage(nextCover);
    setIsPickerOpen(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">{t('title')}</Label>
        <Input
          id="title"
          name="title"
          defaultValue={initialData?.title}
          placeholder={t('titlePlaceholder')}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t('description')}</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={initialData?.description}
          placeholder={t('descriptionPlaceholder')}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="coverImage">{t('coverImage')}</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            id="coverImage"
            name="coverImage"
            value={coverImage}
            onChange={(event) => setCoverImage(event.target.value)}
            placeholder={t('coverImagePlaceholder')}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsPickerOpen(true)}
          >
            {coverImage ? t('coverImageChange') : t('coverImageSelect')}
          </Button>
          {coverImage ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCoverImage('')}
            >
              {t('coverImageClear')}
            </Button>
          ) : null}
        </div>
        {coverImage ? (
          <div className="relative h-32 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <Image
              src={coverImage}
              alt={t('coverImage')}
              fill
              sizes="(max-width: 768px) 100vw, 480px"
              className="object-cover"
            />
          </div>
        ) : null}
        <p className="text-xs text-zinc-500">{t('coverImageHelp')}</p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? t('saving') : initialData ? t('update') : t('create')}
        </Button>
      </DialogFooter>

      <Dialog open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('coverImageSelect')}</DialogTitle>
            <DialogDescription>{t('coverImageHelp')}</DialogDescription>
          </DialogHeader>
          <MediaPicker
            selectionMode="single"
            onConfirm={() => undefined}
            onConfirmItems={handleCoverSelect}
            onCancel={() => setIsPickerOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </form>
  );
}
