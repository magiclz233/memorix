import { NextResponse } from 'next/server';
import { getUsableShareByToken } from '@/app/lib/data/shares';
import {
  createShareUnlockValue,
  shareUnlockCookieName,
} from '@/app/lib/share-access';
import { isValidShareToken, verifySharePassword } from '@/app/lib/share-token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ token: string }> };

/** POST /api/shares/[token]/unlock — 校验密码并设置解锁 cookie */
export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  if (!isValidShareToken(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  const share = await getUsableShareByToken(token);
  if (!share) {
    return NextResponse.json({ error: 'Link unavailable' }, { status: 404 });
  }

  let password = '';
  try {
    const body = (await request.json()) as { password?: unknown };
    if (typeof body.password === 'string') password = body.password;
  } catch {
    // 空 body 视为空密码，下面校验会拒绝
  }

  if (!share.passwordHash || !verifySharePassword(password, share.passwordHash)) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }

  // 过期时间上限：取分享过期时间与 7 天后较早者；永不过期给 7 天滚动窗口
  const maxAge = 7 * 24 * 60 * 60;
  let cookieMaxAge = maxAge;
  if (share.expiresAt) {
    const remaining = Math.floor((share.expiresAt.getTime() - Date.now()) / 1000);
    cookieMaxAge = Math.max(1, Math.min(maxAge, remaining));
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(shareUnlockCookieName(token), createShareUnlockValue(token), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: cookieMaxAge,
  });
  return response;
}
