import { NextResponse } from 'next/server';
import { getUsableShareByToken } from '@/app/lib/data/shares';
import {
  createShareUnlockValue,
  shareUnlockCookieName,
} from '@/app/lib/share-access';
import { isValidShareToken, verifySharePassword } from '@/app/lib/share-token';
import { getClientIdentifier, RateLimiter } from '@/app/lib/rate-limit';
import { RateLimitError } from '@/app/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ token: string }> };

/** POST /api/shares/[token]/unlock — 校验密码并设置解锁 cookie */
export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  if (!isValidShareToken(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  // 密码可暴力尝试：按 IP + token 限制 10 次/分钟；Redis 不可用时降级内存。
  try {
    await RateLimiter.check(
      `${getClientIdentifier(request)}:${token}`,
      'share-unlock',
      { windowMs: 60_000, maxRequests: 10 },
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: 'Too many attempts' },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    }
    throw error;
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
