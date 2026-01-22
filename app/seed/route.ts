import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { auth } from '@/auth';
import { db } from '@/app/lib/drizzle';
import { authAccounts, users } from '@/app/lib/schema';

export const dynamic = 'force-dynamic';

const DEFAULT_ADMIN = {
  name: 'Admin',
  email: 'admin@memorix.com',
  password: '123456',
};

const CREDENTIAL_PROVIDER_ID = 'credential';

export async function GET(request: Request) {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, DEFAULT_ADMIN.email),
  });

  let created = false;
  let accountRepaired = false;
  if (!existing) {
    await auth.api.signUpEmail({
      body: {
        name: DEFAULT_ADMIN.name,
        email: DEFAULT_ADMIN.email,
        password: DEFAULT_ADMIN.password,
      },
      headers: request.headers,
    });
    created = true;
  }

  const target =
    existing ??
    (await db.query.users.findFirst({
      where: eq(users.email, DEFAULT_ADMIN.email),
    }));

  if (!target) {
    return NextResponse.json(
      { success: false, message: 'Failed to create default admin' },
      { status: 500 },
    );
  }

  const existingAccount = await db.query.authAccounts.findFirst({
    where: and(
      eq(authAccounts.userId, target.id),
      eq(authAccounts.providerId, CREDENTIAL_PROVIDER_ID),
    ),
  });

  if (!existingAccount || !existingAccount.password) {
    const passwordHash = await hashPassword(DEFAULT_ADMIN.password);
    if (existingAccount) {
      await db
        .update(authAccounts)
        .set({ password: passwordHash, updatedAt: new Date() })
        .where(eq(authAccounts.id, existingAccount.id));
    } else {
      await db.insert(authAccounts).values({
        userId: target.id,
        accountId: String(target.id),
        providerId: CREDENTIAL_PROVIDER_ID,
        password: passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    accountRepaired = true;
  }

  let roleUpdated = false;
  if (target.role !== 'admin') {
    await db
      .update(users)
      .set({ role: 'admin', updatedAt: new Date() })
      .where(eq(users.email, DEFAULT_ADMIN.email));
    roleUpdated = true;
  }

  return NextResponse.json({
    success: true,
    created,
    accountRepaired,
    roleUpdated,
    email: DEFAULT_ADMIN.email,
  });
}
