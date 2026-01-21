'use client';

import { useTransition, useState } from 'react';
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
          title={isBanned ? '启用用户' : '禁用用户'}
          className={isBanned ? 'text-green-600 hover:text-green-700' : 'text-orange-600 hover:text-orange-700'}
        >
          {isBanned ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isBanned ? '启用用户' : '禁用用户'}</DialogTitle>
          <DialogDescription>
            {isBanned 
              ? '确定要启用该用户吗？用户将恢复登录权限。' 
              : '确定要禁用该用户吗？禁用后用户将无法登录。'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>取消</Button>
          <Button onClick={handleToggle} disabled={isPending} variant={!isBanned ? "destructive" : "default"}>
            {isPending ? '处理中...' : '确定'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteUserButton({ userId, disabled }: UserActionProps) {
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
          title="删除用户"
          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>删除用户</DialogTitle>
          <DialogDescription>
            确定要删除该用户吗？此操作不可恢复，用户数据将被永久清除。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>取消</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? '删除中...' : '确认删除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SetRoleButton({ userId, currentRole, disabled }: SetRoleProps) {
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

  const actionName = currentRole === 'admin' ? '设为普通用户' : '设为管理员';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled || isPending}
          title={disabled ? '当前账号不可降级' : actionName}
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
            确定要将该用户{actionName}吗？
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>取消</Button>
          <Button onClick={handleSetRole} disabled={isPending}>
            {isPending ? '处理中...' : '确定'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
