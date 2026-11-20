import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/app/lib/drizzle';
import { userStorages } from '@/app/lib/schema';
import { requireAdminUser } from '@/app/lib/auth-utils';
import { recordAuditLog } from '@/app/lib/audit-log';
import { planSecretBackfill } from '@/app/lib/storage-secret-backfill';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type BackfillStats = {
  scanned: number;
  updated: number;
  wouldUpdate: number;
  alreadyEncrypted: number;
  masked: number;
  empty: number;
  missing: number;
};

/**
 * POST /api/storage/backfill-secrets — 一次性回填历史明文存储密钥（P2-4 收尾）。
 *
 * P2-4 只在再次保存存储源时加密旧密钥；升级前已存在且之后没编辑过的行仍是
 * 明文。本接口由管理员触发，幂等：密文/脱敏值/空值跳过，只加密明文。
 * 支持 `?dryRun=1` 先看条数；不返回任何密钥或密文。
 */
export async function POST(request: Request) {
  let admin;
  try {
    admin = await requireAdminUser();
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const dryRun = new URL(request.url).searchParams.get('dryRun') === '1';
  const stats: BackfillStats = {
    scanned: 0,
    updated: 0,
    wouldUpdate: 0,
    alreadyEncrypted: 0,
    masked: 0,
    empty: 0,
    missing: 0,
  };

  try {
    const rows = await db
      .select({ id: userStorages.id, config: userStorages.config })
      .from(userStorages);

    for (const row of rows) {
      stats.scanned += 1;
      const plan = planSecretBackfill(row.config);
      if (plan.action === 'skip') {
        if (plan.reason === 'encrypted') stats.alreadyEncrypted += 1;
        else if (plan.reason === 'masked') stats.masked += 1;
        else if (plan.reason === 'missing') stats.missing += 1;
        else stats.empty += 1;
        continue;
      }

      stats.wouldUpdate += 1;
      if (dryRun) continue;

      await db
        .update(userStorages)
        .set({ config: plan.config, updatedAt: new Date() })
        .where(eq(userStorages.id, row.id));
      stats.updated += 1;
    }
  } catch (error) {
    console.error('[storage-backfill] 回填失败:', error);
    return NextResponse.json(
      { error: 'Backfill failed', ...stats, dryRun },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const actorId = Number(admin.id);
  if (!dryRun && Number.isInteger(actorId) && actorId > 0) {
    await recordAuditLog({
      userId: actorId,
      action: 'storage.secrets.backfill',
      resource: 'user_storages',
      changes: { ...stats, dryRun },
    });
  }

  return NextResponse.json(
    { dryRun, ...stats },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
