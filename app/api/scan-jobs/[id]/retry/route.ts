import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/app/lib/drizzle';
import { userStorages, users } from '@/app/lib/schema';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import {
  enqueueScanJob,
  getScanJobById,
} from '@/app/lib/data/scan-jobs';
import { ensureScanJobRunner, kickScanRunner } from '@/app/lib/scan-job-runner';
import { serializeScanJob } from '@/app/lib/data/scan-jobs';

export const runtime = 'nodejs';

/**
 * POST /api/scan-jobs/[id]/retry — 重试。
 * 语义：以原任务的参数生成一个**新**任务（保留旧任务作为历史与失败证据）。
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user?.email;
  if (!email || session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const jobId = Number(id);
  if (!Number.isFinite(jobId) || jobId <= 0) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const previous = await getScanJobById(jobId);
  if (!previous) {
    return NextResponse.json({ error: 'job not found' }, { status: 404 });
  }
  const ownership = await db.query.userStorages.findFirst({
    where: and(eq(userStorages.id, previous.storageId), eq(userStorages.userId, user.id)),
  });
  if (!ownership) {
    return NextResponse.json({ error: 'job not found' }, { status: 404 });
  }

  if (previous.status !== 'failed' && previous.status !== 'cancelled') {
    return NextResponse.json(
      { error: `job is ${previous.status}, only failed/cancelled jobs can be retried` },
      { status: 409 },
    );
  }

  const job = await enqueueScanJob({
    userId: user.id,
    storageId: previous.storageId,
    storageType: previous.storageType,
    mode: previous.mode === 'full' ? 'full' : 'incremental',
  });

  if (!job) {
    return NextResponse.json(
      { error: 'scan job already active for this storage' },
      { status: 409 },
    );
  }

  ensureScanJobRunner();
  kickScanRunner();

  return NextResponse.json({ job: serializeScanJob(job) }, { status: 201 });
}
