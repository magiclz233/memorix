import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { fetchUserByEmail } from '@/app/lib/data';
import {
  createShare,
  filterOwnedFileIds,
  getShareByToken,
  listSharesForUser,
} from '@/app/lib/data/shares';
import {
  generateShareToken,
  hashSharePassword,
  isValidShareToken,
} from '@/app/lib/share-token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILES_PER_SHARE = 500;
const MAX_PASSWORD_LENGTH = 128;
const MAX_EXPIRY_DAYS = 365;

async function currentUserId(): Promise<number | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user?.email;
  if (!email) return null;
  const user = await fetchUserByEmail(email);
  return user?.id ?? null;
}

/** GET /api/shares — 列出当前用户的分享（仅 owner 可见 token） */
export async function GET() {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rows = await listSharesForUser(userId);
  return NextResponse.json({
    shares: rows.map((s) => ({
      id: s.id,
      token: s.token,
      name: s.name,
      fileCount: Array.isArray(s.fileIds) ? s.fileIds.length : 0,
      hasPassword: Boolean(s.passwordHash),
      expiresAt: s.expiresAt ? s.expiresAt.toISOString() : null,
      role: s.role,
      allowDownload: s.allowDownload,
      viewCount: s.viewCount,
      createdAt: s.createdAt.toISOString(),
      url: `/share/${s.token}`,
    })),
  });
}

/** POST /api/shares — 创建分享 */
export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    fileIds?: unknown;
    name?: unknown;
    password?: unknown;
    expiresInDays?: unknown;
    role?: unknown;
    allowDownload?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!Array.isArray(body.fileIds) || body.fileIds.length === 0) {
    return NextResponse.json({ error: 'fileIds required' }, { status: 400 });
  }
  if (body.fileIds.length > MAX_FILES_PER_SHARE) {
    return NextResponse.json({ error: 'too many files' }, { status: 400 });
  }
  const requestedIds = body.fileIds.filter(
    (id): id is number => typeof id === 'number' && Number.isInteger(id),
  );
  const ownedIds = await filterOwnedFileIds(requestedIds, userId);
  if (ownedIds.length === 0) {
    return NextResponse.json({ error: 'no valid files' }, { status: 400 });
  }

  const name =
    typeof body.name === 'string' ? body.name.trim().slice(0, 255) || null : null;
  const password =
    typeof body.password === 'string' ? body.password.trim() : '';
  if (password.length > MAX_PASSWORD_LENGTH) {
    return NextResponse.json({ error: 'password too long' }, { status: 400 });
  }

  let expiresAt: Date | null = null;
  if (body.expiresInDays !== undefined && body.expiresInDays !== null && body.expiresInDays !== '') {
    const days = Number(body.expiresInDays);
    if (!Number.isFinite(days) || days < 1 || days > MAX_EXPIRY_DAYS) {
      return NextResponse.json({ error: 'invalid expiry' }, { status: 400 });
    }
    expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  const role = body.role === 'editor' ? 'editor' : 'viewer';
  const allowDownload = role === 'editor' ? true : body.allowDownload !== false;

  // 生成唯一 token（极低概率冲突则重试）
  let token = generateShareToken();
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!isValidShareToken(token)) break;
    const existing = await getShareByToken(token);
    if (!existing) break;
    token = generateShareToken();
  }

  const share = await createShare(token, {
    userId,
    fileIds: ownedIds,
    name,
    passwordHash: password ? hashSharePassword(password) : null,
    expiresAt,
    role,
    allowDownload,
  });

  return NextResponse.json(
    {
      share: {
        id: share.id,
        token: share.token,
        fileCount: ownedIds.length,
        url: `/share/${share.token}`,
        expiresAt: share.expiresAt ? share.expiresAt.toISOString() : null,
        hasPassword: Boolean(share.passwordHash),
        role: share.role,
        allowDownload: share.allowDownload,
      },
    },
    { status: 201 },
  );
}
