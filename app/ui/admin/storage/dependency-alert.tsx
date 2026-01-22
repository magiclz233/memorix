'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface DependencyAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dependencies: string[];
  onConfirm: () => void;
  isConfirming: boolean;
  title?: string;
  description?: string;
}

export function DependencyAlert({
  open,
  onOpenChange,
  dependencies,
  onConfirm,
  isConfirming,
  title,
  description,
}: DependencyAlertProps) {
  const t = useTranslations('dashboard.storage.view.dependency');
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>{title || t('title')}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {description || t('description')}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[200px] overflow-y-auto rounded-md bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
          <ul className="list-disc space-y-1 pl-4">
            {dependencies.map((dep, index) => (
              <li key={index} className="text-zinc-700 dark:text-zinc-300">
                {dep}
              </li>
            ))}
          </ul>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
          >
            {t('cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? t('processing') : t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
