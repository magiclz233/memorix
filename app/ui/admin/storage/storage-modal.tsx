'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { saveUserStorage } from '@/app/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

type StorageItem = {
  id: number;
  type: string;
  config: unknown;
};

type StorageConfig = {
  rootPath?: string | null;
  alias?: string | null;
  endpoint?: string | null;
  bucket?: string | null;
  region?: string | null;
  accessKey?: string | null;
  secretKey?: string | null;
  prefix?: string | null;
  isDisabled?: boolean;
};

interface StorageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storage: StorageItem | null; // null for add mode
}

export function StorageModal({ open, onOpenChange, storage }: StorageModalProps) {
  const t = useTranslations('dashboard.storage.view.modal');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{storage ? t('editTitle') : t('addTitle')}</DialogTitle>
          <DialogDescription>
            {storage ? t('editDesc') : t('addDesc')}
          </DialogDescription>
        </DialogHeader>
        <StorageForm 
          storage={storage} 
          onSuccess={() => onOpenChange(false)} 
          onCancel={() => onOpenChange(false)} 
        />
      </DialogContent>
    </Dialog>
  );
}

function StorageForm({ 
  storage, 
  onSuccess, 
  onCancel 
}: { 
  storage: StorageItem | null; 
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations('dashboard.storage.view.modal');
  const tTypes = useTranslations('dashboard.storage.form.types');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState(storage?.type ?? 'local');
  const [formData, setFormData] = useState<StorageConfig>((storage?.config ?? {}) as StorageConfig);
  const [message, setMessage] = useState<string | null>(null);

  const STORAGE_TYPES = [
    { value: 'local', label: tTypes('local') },
    { value: 'nas', label: tTypes('nas') },
    { value: 's3', label: tTypes('s3') },
  ] as const;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const payload = {
      id: storage?.id,
      type: type as any,
      ...formData,
    };

    startTransition(async () => {
      // Clean payload, remove nulls
      const cleanPayload = {
        ...Object.fromEntries(
          Object.entries(formData).map(([k, v]) => [k, v ?? undefined])
        ),
        id: storage?.id,
        type: type as 'local' | 'nas' | 's3' | 'qiniu',
      };

      const result = await saveUserStorage(cleanPayload);
      if (result.success) {
        onSuccess();
        router.refresh();
      } else {
        setMessage(result.message ?? t('error'));
      }
    });
  };

  const updateField = (key: keyof StorageConfig, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const isCloud = type === 's3' || type === 'qiniu';
  const isLocal = type === 'local' || type === 'nas';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="type">{t('labels.type')}</Label>
        <Select
          value={type}
          onValueChange={(val) => setType(val)}
          disabled={!!storage}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('labels.type')} />
          </SelectTrigger>
          <SelectContent>
            {STORAGE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="alias">{t('labels.alias')}</Label>
        <Input
          id="alias"
          value={formData.alias ?? ''}
          onChange={(e) => updateField('alias', e.target.value)}
          placeholder={t('placeholders.alias')}
        />
      </div>

      {isLocal && (
        <div className="grid gap-2">
          <Label htmlFor="rootPath">{t('labels.rootPath')}</Label>
          <Input
            id="rootPath"
            value={formData.rootPath ?? ''}
            onChange={(e) => updateField('rootPath', e.target.value)}
            placeholder={type === 'nas' ? t('placeholders.rootPathNas') : t('placeholders.rootPathLocal')}
          />
          <p className="text-xs text-zinc-500">
            {t('hints.permission')}
          </p>
          {type === 'nas' && (
            <p className="text-xs text-amber-600/90 dark:text-amber-500/90">
              {t('hints.nasMapping')}
            </p>
          )}
        </div>
      )}

      {isCloud && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="endpoint">{t('labels.endpoint')}</Label>
              <Input
                id="endpoint"
                value={formData.endpoint ?? ''}
                onChange={(e) => updateField('endpoint', e.target.value)}
                placeholder={t('placeholders.endpoint')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="region">{t('labels.region')}</Label>
              <Input
                id="region"
                value={formData.region ?? ''}
                onChange={(e) => updateField('region', e.target.value)}
                placeholder={t('placeholders.region')}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bucket">{t('labels.bucket')}</Label>
            <Input
              id="bucket"
              value={formData.bucket ?? ''}
              onChange={(e) => updateField('bucket', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="accessKey">{t('labels.accessKey')}</Label>
              <Input
                id="accessKey"
                value={formData.accessKey ?? ''}
                onChange={(e) => updateField('accessKey', e.target.value)}
                type="password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="secretKey">{t('labels.secretKey')}</Label>
              <Input
                id="secretKey"
                value={formData.secretKey ?? ''}
                onChange={(e) => updateField('secretKey', e.target.value)}
                type="password"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prefix">{t('labels.prefix')}</Label>
            <Input
              id="prefix"
              value={formData.prefix ?? ''}
              onChange={(e) => updateField('prefix', e.target.value)}
              placeholder={t('placeholders.prefix')}
            />
          </div>
        </>
      )}

      {message && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-500 dark:bg-red-900/20">
          {message}
        </div>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? t('saving') : t('save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
