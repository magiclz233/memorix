import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { z } from 'zod';
import type { User } from '@/app/lib/definitions';
import bcrypt from 'bcryptjs';
import postgres from 'postgres';
 
const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });
 
async function getUser(email: string): Promise<User | undefined> {
  try {
    const user = await sql<User[]>`SELECT * FROM users WHERE email=${email}`;
    return user[0];
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}
 
export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    GitHub,
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
    async signIn({ user, account }) {
      if (account?.provider === 'github') {
        const { email, name, image } = user;

        if (!email) {
          console.error('GitHub 返回 email 为空，无法同步用户');
          return false;
        }

        try {
          // GitHub 登录后同步到本地用户表，并写入默认加密密码
          const existingUser = await sql<User[]>`SELECT * FROM users WHERE email=${email}`;

          if (existingUser.length === 0) {
            const userName = name ?? 'GitHub 用户';
            // const imageUrl = image ?? null;
            const hashedPassword = await bcrypt.hash('123456', 10);
            await sql`
              INSERT INTO users (name, email, password)
              VALUES (${userName}, ${email}, ${hashedPassword})
            `;
            console.log(`New user ${email} created via ${account.provider}`);
          }
          return true;
        } catch (error) {
          console.error('Error syncing user to DB:', error);
          return false;
        }
      }

      return true;
    },
  },
});
