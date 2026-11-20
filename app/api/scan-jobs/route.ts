import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { and, eq } from 'drizzle-orm';
import { db } from '@/app/lib/drizzle';
import { userStorages, users } from '@/app/lib/schema';
import { auth } from '@/auth';
import {
  enqueueScanJob,
  listScanJobs,
  serializeScanJob,
} from '@/app/lib/data/scan-jobs';
import { ensureScanJobRunner, kickScanRunner } from '@/app/lib/scan-job-runner';

export const runtime = 'nodejs';

async function requireAdminUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user?.email;
  if (!email || session?.user?.role !== 'admin') {
    return null;
  }
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  return user ?? null;
}

/** GET /api/scan-jobs?storageId=N — 某存储源的扫描任务历史 */
export async function GET(request: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const storageId = Number(new URL(request.url).searchParams.get('storageId'));
  if (!Number.isFinite(storageId) || storageId <= 0) {
    return NextResponse.json({ error: 'invalid storageId' }, { status: 400 });
  }

  const ownership = await db.query.userStorages.findFirst({
    where: and(eq(userStorages.id, storageId), eq(userStorages.userId, user.id)),
  });
  if (!ownership) {
    return NextResponse.json({ error: 'storage not found' }, { status: 404 });
  }

  const jobs = await listScanJobs(storageId);
  return NextResponse.json({ jobs: jobs.map(serializeScanJob) });
}

/** POST /api/scan-jobs { storageId, mode } — 入队扫描任务 */
export async function POST(request: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { storageId?: number | string; mode?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const storageId = Number(body.storageId);
  const mode = body.mode === 'full' ? 'full' : 'incremental';
  if (!Number.isFinite(storageId) || storageId <= 0) {
    return NextResponse.json({ error: 'invalid storageId' }, { status: 400 });
  }

  const storage = await db.query.userStorages.findFirst({
    where: and(eq(userStorages.id, storageId), eq(userStorages.userId, user.id)),
  });
  if (!storage) {
    return NextResponse.json({ error: 'storage not found' }, { status: 404 });
  }

  const config = (storage.config ?? {}) as { isDisabled?: boolean };
  if (config.isDisabled) {
    return NextResponse.json({ error: 'storage disabled' }, { status: 409 });
  }
  if (storage.type !== 'local' && storage.type !== 'nas' && storage.type !== 's3') {
    return NextResponse.json({ error: 'unsupported storage type' }, { status: 400 });
  }

  const job = await enqueueScanJob({
    userId: user.id,
    storageId: storage.id,
    storageType: storage.type,
    mode,
  });

  if (!job) {
    // 已有排队/执行中的任务——刷新页面不并发重扫的关键分支
    return NextResponse.json(
      { error: 'scan job already active for this storage' },
      { status: 409 },
    );
  }

  ensureScanJobRunner();
  kickScanRunner();

  return NextResponse.json({ job: serializeScanJob(job) }, { status: 201 });
}
