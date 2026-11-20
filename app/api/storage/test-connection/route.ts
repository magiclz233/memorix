import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/app/lib/drizzle';
import { userStorages, users } from '@/app/lib/schema';
import { requireAdminUser } from '@/app/lib/auth-utils';
import { StorageConfigSchema } from '@/app/lib/storage-config-schema';
import { isMaskedSecret } from '@/app/lib/secret-box';
import { testStorageConnection } from '@/app/lib/storage-test';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/storage/test-connection — 测试存储源连通性（P2-4）。
 *
 * 请求体为存储配置；编辑已有存储时若 secretKey 为空或为脱敏值（****xxxx），
 * 从数据库取回已存密钥解密后测试。响应只含成功/失败阶段与错误码，不回显密钥。
 */
export async function POST(request: Request) {
  let admin;
  try {
    admin = await requireAdminUser();
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = StorageConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, stage: 'config', message: '存储配置不完整或格式不正确' },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const dbUser = await db.query.users.findFirst({
    where: eq(users.email, admin.email),
  });
  if (!dbUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let storedSecret: string | null = null;
  if (data.id) {
    const existing = await db.query.userStorages.findFirst({
      where: and(eq(userStorages.id, data.id), eq(userStorages.userId, dbUser.id)),
    });
    if (!existing) {
      return NextResponse.json({ error: 'Storage not found' }, { status: 404 });
    }
    const existingConfig = (existing.config ?? {}) as { secretKey?: string | null };
    storedSecret =
      typeof existingConfig.secretKey === 'string' ? existingConfig.secretKey : null;
  }

  const incomingSecret = data.secretKey?.trim() ?? '';
  const secretKey =
    incomingSecret && !isMaskedSecret(incomingSecret) ? incomingSecret : storedSecret;

  const result = await testStorageConnection({ ...data, secretKey: secretKey ?? undefined });
  return NextResponse.json(result, {
    status: result.ok ? 200 : 400,
    headers: { 'Cache-Control': 'no-store' },
  });
}
