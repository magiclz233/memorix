'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('dashboard.settings.profile.passwordForm');
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
          <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-3 h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              placeholder={t('currentPasswordPlaceholder')}
              required
              className="pl-9 h-10"
              autoComplete="current-password"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="newPassword">{t('newPassword')}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              placeholder={t('newPasswordPlaceholder')}
              required
              minLength={6}
              className="pl-9 h-10"
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
          <div className="relative">
            <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder={t('confirmPasswordPlaceholder')}
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
            {t('cancel')}
          </Button>
        )}
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? t('saving') : t('submit')}
        </Button>
      </div>
    </form>
  );
}
