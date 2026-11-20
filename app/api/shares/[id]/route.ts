import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { fetchUserByEmail } from '@/app/lib/data';
import { getShareById, revokeShare } from '@/app/lib/data/shares';
import { recordAuditLog } from '@/app/lib/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

async function currentUserId(): Promise<number | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user?.email;
  if (!email) return null;
  const user = await fetchUserByEmail(email);
  return user?.id ?? null;
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
