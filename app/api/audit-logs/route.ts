import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { and, desc, eq, lt } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/app/lib/drizzle';
import { auditLogs, users } from '@/app/lib/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

async function isAdmin(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.role === 'admin';
}

/**
 * GET /api/audit-logs?limit=50&before=<id>&action=&resource=
 *
 * 管理员查看最近审计日志；最简单的前翻页（before = 上一页最后一条 id）。
 * 只读，不提供写入入口。
 */
export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get('limit'));
  const limit =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(Math.trunc(limitParam), MAX_LIMIT)
      : DEFAULT_LIMIT;

  const beforeParam = Number(url.searchParams.get('before'));
  const before =
    Number.isInteger(beforeParam) && beforeParam > 0 ? beforeParam : null;

  const conditions = [];
  if (before) conditions.push(lt(auditLogs.id, before));
  const action = url.searchParams.get('action')?.trim();
  if (action) conditions.push(eq(auditLogs.action, action));
  const resource = url.searchParams.get('resource')?.trim();
  if (resource) conditions.push(eq(auditLogs.resource, resource));

  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      resource: auditLogs.resource,
      resourceId: auditLogs.resourceId,
      userId: auditLogs.userId,
      userEmail: users.email,
      userName: users.name,
      changes: auditLogs.changes,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(limit);

  return NextResponse.json(
    {
      logs: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
      nextBefore: rows.length === limit ? rows[rows.length - 1]?.id ?? null : null,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
