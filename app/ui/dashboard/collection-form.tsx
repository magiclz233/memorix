'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
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
import { Textarea } from '@/components/ui/textarea';
import {
  createCollection,
  updateCollection,
} from '@/app/lib/actions/unified-collections';
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
  author?: string | null;
  type?: 'mixed' | 'photo' | 'video';
  status?: 'draft' | 'published';
  coverImages?: number[];
  coverUrls?: string[];
  coverThumbUrl?: string | null;
  coverMediaType?: 'image' | 'video' | 'animated' | null;
};

type CollectionFormProps = {
  initialData?: CollectionFormData | null;
  defaultAuthor?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
};

export function CollectionForm({
  initialData,
  defaultAuthor,
  onSuccess,
  onCancel,
}: CollectionFormProps) {
  const t = useTranslations('dashboard.collections.form');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [collectionType, setCollectionType] = useState<
    'mixed' | 'photo' | 'video'
  >(() => initialData?.type ?? 'mixed');
  const [collectionStatus, setCollectionStatus] = useState<
    'draft' | 'published'
  >(() => initialData?.status ?? 'draft');
  const [author, setAuthor] = useState(() => initialData?.author ?? defaultAuthor ?? '');
  const [coverFileIds, setCoverFileIds] = useState<number[]>(() =>
    initialData?.coverImages && initialData.coverImages.length > 0
      ? initialData.coverImages
      : [],
  );
  const [coverPreviews, setCoverPreviews] = useState<string[]>(() =>
    initialData?.coverUrls && initialData.coverUrls.length > 0
      ? initialData.coverUrls
      : [],
  );
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = initialData?.id
        ? await updateCollection(initialData.id, formData)
        : await createCollection(formData);

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
    if (selectedItems.length === 0) {
      setIsPickerOpen(false);
      return;
    }

    const nextIds = selectedItems.map((item) => item.id);
    const nextPreviews = selectedItems.map((item) =>
      item.mediaType === 'video'
        ? item.thumbUrl || `/api/media/thumb/${item.id}`
        : item.url || item.thumbUrl || `/api/media/thumb/${item.id}`,
    );

    setCoverFileIds(nextIds);
    setCoverPreviews(nextPreviews);
    setIsPickerOpen(false);
  };

  const coverMediaTypes = ['image', 'animated', 'video'] as const;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="type" value={collectionType} />
      <input type="hidden" name="status" value={collectionStatus} />
      <input type="hidden" name="coverImages" value={JSON.stringify(coverFileIds)} />
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
        <Label htmlFor="author">{t('author')}</Label>
        <Input
          id="author"
          name="author"
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
          placeholder={t('authorPlaceholder')}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">{t('type')}</Label>
          <Select
            value={collectionType}
            onValueChange={(value) =>
              setCollectionType(value as 'mixed' | 'photo' | 'video')
            }
          >
            <SelectTrigger id="type">
              <SelectValue placeholder={t('typePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mixed">{t('typeMixed')}</SelectItem>
              <SelectItem value="photo">{t('typePhoto')}</SelectItem>
              <SelectItem value="video">{t('typeVideo')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">{t('status')}</Label>
          <Select
            value={collectionStatus}
            onValueChange={(value) =>
              setCollectionStatus(value as 'draft' | 'published')
            }
          >
            <SelectTrigger id="status">
              <SelectValue placeholder={t('statusPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">{t('statusDraft')}</SelectItem>
              <SelectItem value="published">{t('statusPublished')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t('descriptionLabel')}</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={initialData?.description}
          placeholder={t('descriptionPlaceholder')}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="coverFileId">{t('coverImage')}</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsPickerOpen(true)}
          >
            {coverFileIds.length > 0
              ? t('coverImageChange')
              : t('coverImageSelect')}
          </Button>
          {coverFileIds.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setCoverFileIds([]);
                setCoverPreviews([]);
              }}
            >
              {t('coverImageClear')}
            </Button>
          ) : null}
        </div>
        {coverPreviews.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {coverPreviews.map((preview, index) => (
              <div
                key={index}
                className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800"
              >
                <Image
                  src={preview}
                  alt={`${t('coverImage')} ${index + 1}`}
                  fill
                  sizes="128px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        ) : null}
        <p className="text-xs text-zinc-500">{t('coverImageHelp')}</p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
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
            selectionMode="multiple"
            maxSelect={3}
            onConfirm={() => undefined}
            onConfirmItems={handleCoverSelect}
            onCancel={() => setIsPickerOpen(false)}
            allowedMediaTypes={coverMediaTypes}
            initialSelectedIds={coverFileIds}
          />
        </DialogContent>
      </Dialog>
    </form>
  );
}
