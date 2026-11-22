import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/drizzle';
import { errorLogs } from '@/app/lib/schema';
import { RateLimiter, getClientIdentifier } from '@/app/lib/rate-limit';

/** 只保留可序列化的标量上下文，避免把任意对象写进 JSONB。 */
function toLimitedString(value: unknown, maxLength: number) {
  if (value === null || value === undefined) return null;
  if (!['string', 'number', 'boolean'].includes(typeof value)) return null;
  return String(value).slice(0, maxLength);
}

/** 埋点对游客开放，但只接受本源浏览器上报，防外部脚本投毒。 */
function isBrowserTelemetry(request: NextRequest): boolean {
  const site = request.headers.get('sec-fetch-site');
  if (site === 'cross-site') return false;
  if (site === 'same-origin' || site === 'same-site') return true;
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isBrowserTelemetry(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // 速率限制：每 IP 每分钟最多 30 次
    const identifier = getClientIdentifier(request);
    await RateLimiter.check(identifier, 'analytics-errors', {
      windowMs: 60 * 1000,
      maxRequests: 30,
    });

    const data = await request.json();

    await db.insert(errorLogs).values({
      level: 'error',
      message: String(data.message || 'Unknown client error').slice(0, 1000),
      stack: data.stack ? String(data.stack).slice(0, 5000) : null,
      context: {
        type: toLimitedString(data.type, 100),
        filename: toLimitedString(data.filename, 500),
        lineno: toLimitedString(data.lineno, 20),
        source: 'client',
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false });
  }
}
