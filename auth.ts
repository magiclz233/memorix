import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '@/app/lib/drizzle';
import { users } from '@/app/lib/schema';
import { eq } from 'drizzle-orm';

type DbUser = typeof users.$inferSelect;

type GitHubEmailItem = {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility?: 'public' | 'private' | null;
};

async function getUser(email: string): Promise<DbUser | undefined> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    return user ?? undefined;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

async function getGitHubVerifiedEmail(
  accessToken?: string | null,
): Promise<string | null> {
  if (!accessToken) return null;

  try {
    const response = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'next-auth',
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;
    const emails = (await response.json()) as GitHubEmailItem[];
    const best =
      emails.find((item) => item.primary && item.verified) ??
      emails.find((item) => item.verified) ??
      emails[0];
    return best?.email ?? null;
  } catch (error) {
    console.error('获取 GitHub email 失败：', error);
    return null;
  }
}
 
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    GitHub({
      authorization: { params: { scope: 'read:user user:email' } },
    }),
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);
 
        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await getUser(email);
          if (!user) return null;
          const passwordsMatch = await bcrypt.compare(password, user.password);
 
          if (passwordsMatch) return user;
        }
 
        console.log('Invalid credentials');
        return null;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === 'github') {
        const email =
          user.email ?? (await getGitHubVerifiedEmail(account.access_token));
        const { name, image } = user;

        if (!email) {
          console.error('GitHub 未返回 email，且无法从 API 获取；本次不做用户同步');
          return true;
        }

        try {
          // GitHub 登录后同步到本地用户表，并写入默认加密密码
          const existingUser = await db.query.users.findFirst({
            where: eq(users.email, email),
          });

          if (!existingUser) {
            const userName = name ?? 'GitHub 用户';
            const imageUrl = image ?? null;
            const hashedPassword = await bcrypt.hash('123456', 10);
            await db.insert(users).values({
              name: userName,
              email,
              password: hashedPassword,
              imageUrl,
            });
            console.log(`New user ${email} created via ${account.provider}`);
          }
          return true;
        } catch (error) {
          console.error('GitHub 用户同步到数据库失败：', error);
          return true;
        }
      }

      return true;
    },
  },
});
