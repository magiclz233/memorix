import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/app/lib/drizzle';
import { shares } from '@/app/lib/schema';
import { getSessionUserId } from '@/app/lib/session-user';
import { getShareById, revokeShare } from '@/app/lib/data/shares';
import { hashSharePassword } from '@/app/lib/share-token';
import { recordAuditLog } from '@/app/lib/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

async function currentUserId(): Promise<number | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return getSessionUserId(session);
}

/** PATCH /api/shares/[id] — 更新分享名称、有效期、密码、角色或下载权限 */
export async function PATCH(request: Request, { params }: Params) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const shareId = Number(id);
  if (!Number.isInteger(shareId) || shareId <= 0) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const share = await getShareById(shareId);
  if (!share || share.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const updates: {
    name?: string | null;
    passwordHash?: string | null;
    expiresAt?: Date | null;
    role?: string;
    allowDownload?: boolean;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if ('name' in body) {
    const rawName = typeof body.name === 'string' ? body.name.trim() : '';
    updates.name = rawName.length > 0 ? rawName.slice(0, 255) : null;
  }

  if ('password' in body) {
    if (body.password === null || body.password === '') {
      updates.passwordHash = null;
    } else if (typeof body.password === 'string' && body.password.trim().length > 0) {
      updates.passwordHash = hashSharePassword(body.password.trim());
    }
  }

  if ('expiresInDays' in body) {
    if (body.expiresInDays === null || body.expiresInDays === 'never') {
      updates.expiresAt = null;
    } else {
      const days = Number(body.expiresInDays);
      if (Number.isFinite(days) && days > 0 && days <= 3650) {
        updates.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      }
    }
  }

  if (body.role === 'viewer' || body.role === 'editor') {
    updates.role = body.role;
  }

  if (typeof body.allowDownload === 'boolean') {
    updates.allowDownload = body.allowDownload;
  }

  const [updated] = await db
    .update(shares)
    .set(updates)
    .where(and(eq(shares.id, shareId), eq(shares.userId, userId)))
    .returning();

  if (updated) {
    await recordAuditLog({
      userId,
      action: 'share.update',
      resource: 'share',
      resourceId: shareId,
      changes: {
        name: updated.name,
        hasPassword: Boolean(updated.passwordHash),
        expiresAt: updated.expiresAt?.toISOString() ?? null,
        role: updated.role,
        allowDownload: updated.allowDownload,
      },
    });
  }

  return NextResponse.json({
    ok: Boolean(updated),
    share: updated
      ? {
          id: updated.id,
          token: updated.token,
          name: updated.name,
          hasPassword: Boolean(updated.passwordHash),
          expiresAt: updated.expiresAt?.toISOString() ?? null,
          role: updated.role,
          allowDownload: updated.allowDownload,
        }
      : null,
  });
}

/** DELETE /api/shares/[id] — 吊销分享（软吊销，可再次创建；不物理删除审计痕迹） */
export async function DELETE(_request: Request, { params }: Params) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const shareId = Number(id);
  if (!Number.isInteger(shareId) || shareId <= 0) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const share = await getShareById(shareId);
  if (!share || share.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const ok = await revokeShare(shareId, userId);
  if (ok) {
    await recordAuditLog({
      userId,
      action: 'share.revoke',
      resource: 'share',
      resourceId: shareId,
      changes: {
        name: share.name,
        fileCount: Array.isArray(share.fileIds) ? share.fileIds.length : 0,
        role: share.role,
      },
    });
  }
  return NextResponse.json({ ok });
}
