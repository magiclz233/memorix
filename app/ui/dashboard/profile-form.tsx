'use client';

import { useActionState } from 'react';
import { updateProfile } from '@/app/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail } from 'lucide-react';

export function ProfileForm({ 
  user 
}: { 
  user: { name: string; email: string } 
}) {
  const [state, action, isPending] = useActionState(updateProfile, undefined);

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">姓名</Label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              id="name"
              name="name"
              defaultValue={user.name}
              placeholder="请输入姓名"
              required
              className="pl-9"
            />
          </div>
          {state?.errors?.name && (
            <p className="text-sm text-red-500">{state.errors.name[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">邮箱</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={user.email}
              placeholder="请输入邮箱"
              required
              className="pl-9"
            />
          </div>
          {state?.errors?.email && (
            <p className="text-sm text-red-500">{state.errors.email[0]}</p>
          )}
        </div>
      </div>

      {state?.message && (
        <p className={`text-sm ${state.success ? 'text-green-600' : 'text-red-500'}`}>
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? '保存中...' : '保存资料'}
      </Button>
    </form>
  );
}
