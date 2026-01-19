'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Ban, CheckCircle } from 'lucide-react';
import { toggleUserBan, deleteUser, setUserRole } from '@/app/lib/actions';

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

  const handleToggle = () => {
    if (!confirm(isBanned ? '确定要启用该用户吗？' : '确定要禁用该用户吗？禁用后用户将无法登录。')) {
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('userId', userId.toString());
      formData.append('banned', (!isBanned).toString());
      
      const result = await toggleUserBan(formData);
      if (!result.success) {
        alert(result.message);
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={disabled || isPending}
      title={isBanned ? '启用用户' : '禁用用户'}
      className={isBanned ? 'text-green-600 hover:text-green-700' : 'text-orange-600 hover:text-orange-700'}
      onClick={handleToggle}
    >
      {isBanned ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
    </Button>
  );
}

export function DeleteUserButton({ userId, disabled }: UserActionProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm('确定要删除该用户吗？此操作不可恢复。')) {
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('userId', userId.toString());
      
      const result = await deleteUser(formData);
      if (!result.success) {
        alert(result.message);
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={disabled || isPending}
      title="删除用户"
      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
      onClick={handleDelete}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

export function SetRoleButton({ userId, currentRole, disabled }: SetRoleProps) {
  const [isPending, startTransition] = useTransition();
  const nextRole = currentRole === 'admin' ? 'user' : 'admin';

  const handleSetRole = () => {
    const actionName = currentRole === 'admin' ? '设为普通用户' : '设为管理员';
    if (!confirm(`确定要将该用户${actionName}吗？`)) {
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('userId', userId.toString());
      formData.append('role', nextRole);
      
      const result = await setUserRole(formData);
      if (!result.success) {
        alert(result.message);
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={disabled || isPending}
      title={disabled ? '当前账号不可降级' : (currentRole === 'admin' ? '设为普通用户' : '设为管理员')}
      onClick={handleSetRole}
    >
      {currentRole === 'admin' ? <span className="text-xs font-bold">User</span> : <span className="text-xs font-bold">Admin</span>}
    </Button>
  );
}
