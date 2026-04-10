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
import { AlertTriangle, LinkIcon, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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
      <DialogContent className="max-w-md gap-0 p-0 overflow-hidden rounded-2xl border-zinc-200 dark:border-zinc-800">
        <DialogHeader className="p-8 pb-0">
          <div className="flex items-center gap-4 text-amber-500">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-900/20">
               <AlertTriangle className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
                <DialogTitle className="text-xl font-bold tracking-tight">{title || t('title')}</DialogTitle>
                <DialogDescription className="mt-1 text-zinc-500 dark:text-zinc-400">
                    {description || t('description')}
                </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8">
            <ScrollArea className={cn(
                "rounded-xl border border-zinc-100 bg-zinc-50/50 p-2 dark:border-zinc-800 dark:bg-zinc-900/30",
                dependencies.length > 3 ? "h-[220px]" : "h-auto max-h-[220px]"
            )}>
              <AnimatePresence>
                <div className="space-y-2 p-1">
                    {dependencies.map((dep, index) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        key={index} 
                        className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm border border-zinc-50 dark:bg-zinc-900 dark:border-zinc-800"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-50 text-zinc-400 dark:bg-zinc-800">
                            <LinkIcon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          {dep}
                        </span>
                      </motion.div>
                    ))}
                </div>
              </AnimatePresence>
            </ScrollArea>
            
            <p className="mt-4 text-center text-xs font-bold uppercase tracking-widest text-rose-500/80">
                {t('impactWarning') || 'Action cannot be undone'}
            </p>
        </div>

        <DialogFooter className="bg-zinc-50/50 p-6 flex items-center justify-between gap-3 dark:bg-zinc-900/50">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
            className="flex-1 rounded-full h-11 font-bold text-zinc-500 hover:bg-zinc-200/50"
          >
            {t('cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isConfirming}
            className="flex-1 rounded-full h-11 font-bold shadow-lg shadow-rose-500/20 transition-all hover:shadow-rose-500/30"
          >
            {isConfirming ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('processing')}</>
            ) : (
                t('confirm')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
