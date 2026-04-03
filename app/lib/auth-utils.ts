import { auth } from './auth';
import { headers } from 'next/headers';
import { UnauthorizedError, ForbiddenError } from './errors';

export async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new UnauthorizedError();
  }
  return session.user;
}

export async function requireAdminUser() {
  const user = await requireUser();
  if (user.role !== 'admin') {
    throw new ForbiddenError('Admin access required');
  }
  return user;
}

export async function getOptionalUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}
