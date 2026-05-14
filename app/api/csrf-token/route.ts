import { NextResponse } from 'next/server';
import { requireUser } from '@/app/lib/auth-utils';
import { CSRFProtection } from '@/app/lib/csrf';

/**
 * 获取 CSRF Token
 * 客户端在发起状态变更请求前调用此接口获取 Token
 */
export async function GET() {
  try {
    const user = await requireUser();
    const token = await CSRFProtection.generateToken(Number(user.id));
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
