'use client';

import { useActionState, useEffect, useRef } from 'react';
import { changePasswordAction, signOutAction } from '@/app/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Lock, ShieldCheck } from 'lucide-react';

export function ChangePasswordForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, action, isPending] = useActionState(changePasswordAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      
      // If onSuccess is provided, call it.
      // But also we need to sign out if this is from the frontend dialog.
      // However, the user request says: "If user changes password, logout and redirect to login page".
      // We can trigger signOutAction here.
      
      const performLogout = async () => {
         // Add a small delay to let the user see the success message if needed, 
         // but usually we want to redirect immediately or show a toast then redirect.
         // Since we are in a client component, we can call the server action for signout.
         await signOutAction();
      };
      
      performLogout();
      onSuccess?.();
    }
  }, [state?.success, onSuccess]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">当前密码</Label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            placeholder="请输入当前密码"
            required
            className="pl-9"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="newPassword">新密码</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            placeholder="请输入新密码"
            required
            minLength={6}
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">确认密码</Label>
        <div className="relative">
          <ShieldCheck className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="再次输入密码"
            required
            minLength={6}
            className="pl-9"
          />
        </div>
        {state?.errors?.confirmPassword && (
          <p className="text-sm text-red-500">{state.errors.confirmPassword[0]}</p>
        )}
      </div>

      {state?.message && (
        <p className={`text-sm ${state.success ? 'text-green-600' : 'text-red-500'}`}>
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? '保存中...' : '修改密码'}
      </Button>
    </form>
  );
}
