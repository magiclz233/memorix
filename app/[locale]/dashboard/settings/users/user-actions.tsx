'use client';

import { useTransition, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Trash2, Ban, CheckCircle, ShieldCheck, UserCircle } from 'lucide-react';
import { toggleUserBan, deleteUser, setUserRole } from '@/app/lib/actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface UserActionProps {
  userId: number;
  disabled?: boolean;
}

interface ToggleBanProps extends UserActionProps {
  isBanned: boolean;
}

interface SetRoleProps extends UserActionProps {
  currentRole: 'admin' | 'user';
}

export function ToggleBanButton({ userId, isBanned, disabled }: ToggleBanProps) {
  const t = useTranslations('dashboard.settings.users.actions');
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const handleToggle = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('userId', userId.toString());
      formData.append('banned', (!isBanned).toString());
      
      const result = await toggleUserBan(formData);
      if (!result.success) {
        alert(result.message);
      }
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled || isPending}
          title={isBanned ? t('enableUser') : t('disableUser')}
          className={isBanned ? 'text-green-600 hover:text-green-700' : 'text-orange-600 hover:text-orange-700'}
        >
          {isBanned ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isBanned ? t('enableUser') : t('disableUser')}</DialogTitle>
          <DialogDescription>
            {isBanned 
              ? t('confirmEnable')
              : t('confirmDisable')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>{t('cancel')}</Button>
          <Button onClick={handleToggle} disabled={isPending} variant={!isBanned ? "destructive" : "default"}>
            {isPending ? t('processing') : t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteUserButton({ userId, disabled }: UserActionProps) {
  const t = useTranslations('dashboard.settings.users.actions');
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('userId', userId.toString());
      
      const result = await deleteUser(formData);
      if (!result.success) {
        alert(result.message);
      }
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled || isPending}
          title={t('deleteUser')}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('deleteUser')}</DialogTitle>
          <DialogDescription>
            {t('confirmDelete')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>{t('cancel')}</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? t('deleting') : t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SetRoleButton({ userId, currentRole, disabled }: SetRoleProps) {
  const t = useTranslations('dashboard.settings.users.actions');
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const nextRole = currentRole === 'admin' ? 'user' : 'admin';

  const handleSetRole = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('userId', userId.toString());
      formData.append('role', nextRole);
      
      const result = await setUserRole(formData);
      if (!result.success) {
        alert(result.message);
      }
      setOpen(false);
    });
  };

  const actionName = currentRole === 'admin' ? t('setUser') : t('setAdmin');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled || isPending}
          title={disabled ? t('cannotDowngrade') : actionName}
          className={currentRole === 'admin' ? 'text-zinc-500 hover:text-zinc-700' : 'text-indigo-600 hover:text-indigo-700'}
        >
          {currentRole === 'admin' ? (
            <UserCircle className="h-4 w-4" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{actionName}</DialogTitle>
          <DialogDescription>
            {t('confirmRoleChange', { action: actionName })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>{t('cancel')}</Button>
          <Button onClick={handleSetRole} disabled={isPending}>
            {isPending ? t('processing') : t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
