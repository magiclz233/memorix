'use client';

import { useRouter } from '@/i18n/navigation';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

export function Modal({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  function onOpenChange(open: boolean) {
    if (!open) {
      router.back();
    }
  }

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-2xl">
        <DialogTitle className="sr-only">Modal</DialogTitle>
        <DialogDescription className="sr-only">Modal Content</DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}
