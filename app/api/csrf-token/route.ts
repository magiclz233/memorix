import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { headers } from 'next/headers';
import { CSRFProtection } from '@/app/lib/csrf';

/**
 * 获取 CSRF Token
 * 客户端在发起状态变更请求前调用此接口获取 Token
 */
export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = await CSRFProtection.generateToken(Number(session.user.id));

  return NextResponse.json({ token });
}
