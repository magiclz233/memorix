'use client';

import { useActionState, useEffect, useRef } from 'react';
import { changePasswordAction, signOutAction } from '@/app/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Lock, ShieldCheck } from 'lucide-react';

export function ChangePasswordForm({ 
  onSuccess, 
  onCancel 
}: { 
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [state, action, isPending] = useActionState(changePasswordAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      
      const performLogout = async () => {
         await signOutAction();
      };
      
      performLogout();
      onSuccess?.();
    }
  }, [state?.success, onSuccess]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">当前密码</Label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-3 h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              placeholder="请输入当前密码"
              required
              className="pl-9 h-10"
              autoComplete="current-password"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="newPassword">新密码</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              placeholder="请输入新密码（至少6位）"
              required
              minLength={6}
              className="pl-9 h-10"
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">确认密码</Label>
          <div className="relative">
            <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="再次输入新密码"
              required
              minLength={6}
              className="pl-9 h-10"
              autoComplete="new-password"
            />
          </div>
          {state?.errors?.confirmPassword && (
            <p className="text-sm text-red-500 font-medium">{state.errors.confirmPassword[0]}</p>
          )}
        </div>
      </div>

      {state?.message && (
        <div className={`p-3 rounded-md text-sm ${state.success ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
          {state.message}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button 
            type="button" 
            variant="outline" 
            className="flex-1"
            onClick={onCancel}
          >
            取消
          </Button>
        )}
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? '保存中...' : '修改密码'}
        </Button>
      </div>
    </form>
  );
}
