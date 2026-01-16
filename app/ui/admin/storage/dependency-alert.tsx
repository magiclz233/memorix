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
  title = '存在依赖项',
  description = '以下集合正在使用该数据源中的图片。继续操作将导致这些集合中的相关图片无法显示（停用）或被永久删除（删除）。',
}: DependencyAlertProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {description}
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
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? '处理中...' : '确认继续'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
