import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/app/lib/drizzle';
import { userStorages, users } from '@/app/lib/schema';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { getScanJobById } from '@/app/lib/data/scan-jobs';
import { serializeScanJob } from '@/app/lib/data/scan-jobs';

export const runtime = 'nodejs';

/** GET /api/scan-jobs/[id] — 任务详情（含日志环与失败列表） */
export async function GET(
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

  const job = await getScanJobById(jobId);
  if (!job) {
    return NextResponse.json({ error: 'job not found' }, { status: 404 });
  }

  const ownership = await db.query.userStorages.findFirst({
    where: and(eq(userStorages.id, job.storageId), eq(userStorages.userId, user.id)),
  });
  if (!ownership) {
    return NextResponse.json({ error: 'job not found' }, { status: 404 });
  }

  return NextResponse.json({
    job: {
      ...serializeScanJob(job),
      logs: Array.isArray(job.logs) ? job.logs : [],
      errors: Array.isArray(job.errors) ? job.errors : [],
    },
  });
}
