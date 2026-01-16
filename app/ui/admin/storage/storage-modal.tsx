'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

const STORAGE_TYPES = [
  { value: 'local', label: '本地存储' },
  { value: 'nas', label: 'NAS 存储' },
  { value: 's3', label: 'S3 兼容' },
  { value: 'qiniu', label: '七牛云' },
] as const;

export function StorageModal({ open, onOpenChange, storage }: StorageModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{storage ? '编辑存储配置' : '新增存储配置'}</DialogTitle>
          <DialogDescription>
            {storage ? '修改现有存储源的连接信息。' : '添加新的图片存储源。'}
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState(storage?.type ?? 'local');
  const [formData, setFormData] = useState<StorageConfig>((storage?.config ?? {}) as StorageConfig);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const payload = {
      id: storage?.id,
      type: type as any,
      ...formData,
    };

    startTransition(async () => {
      // 清理 payload，去除 null 值并确保类型匹配
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
        setMessage(result.message ?? '保存失败');
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
        <Label htmlFor="type">存储类型</Label>
        <select
          id="type"
          className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus-visible:ring-zinc-300"
          value={type}
          onChange={(e) => setType(e.target.value)}
          disabled={!!storage} 
        >
          {STORAGE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="alias">别名 (可选)</Label>
        <Input
          id="alias"
          value={formData.alias ?? ''}
          onChange={(e) => updateField('alias', e.target.value)}
          placeholder="例如：我的摄影作品"
        />
      </div>

      {isLocal && (
        <div className="grid gap-2">
          <Label htmlFor="rootPath">根目录路径</Label>
          <Input
            id="rootPath"
            value={formData.rootPath ?? ''}
            onChange={(e) => updateField('rootPath', e.target.value)}
            placeholder={type === 'nas' ? '/mnt/nas/photos' : 'D:/photos'}
          />
          <p className="text-xs text-zinc-500">
            请确保服务器有权限访问该路径。
          </p>
        </div>
      )}

      {isCloud && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="endpoint">Endpoint (S3 必填)</Label>
              <Input
                id="endpoint"
                value={formData.endpoint ?? ''}
                onChange={(e) => updateField('endpoint', e.target.value)}
                placeholder="s3.region.amazonaws.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                value={formData.region ?? ''}
                onChange={(e) => updateField('region', e.target.value)}
                placeholder="us-east-1"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bucket">Bucket 名称</Label>
            <Input
              id="bucket"
              value={formData.bucket ?? ''}
              onChange={(e) => updateField('bucket', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="accessKey">Access Key</Label>
              <Input
                id="accessKey"
                value={formData.accessKey ?? ''}
                onChange={(e) => updateField('accessKey', e.target.value)}
                type="password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="secretKey">Secret Key</Label>
              <Input
                id="secretKey"
                value={formData.secretKey ?? ''}
                onChange={(e) => updateField('secretKey', e.target.value)}
                type="password"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prefix">路径前缀 (可选)</Label>
            <Input
              id="prefix"
              value={formData.prefix ?? ''}
              onChange={(e) => updateField('prefix', e.target.value)}
              placeholder="photos/"
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
          取消
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? '保存中...' : '保存配置'}
        </Button>
      </DialogFooter>
    </form>
  );
}
