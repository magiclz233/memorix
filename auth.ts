import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { eq, notInArray, sql } from 'drizzle-orm';
import { db } from '@/app/lib/drizzle';
import {
  authAccounts,
  authSessions,
  authVerifications,
  userSettings,
  userStorages,
  users,
} from '@/app/lib/schema';

// 额外可信来源（例如绿联 UGLink 外网域名），逗号分隔；baseURL 本身自动可信
const trustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const auth = betterAuth({
  trustedOrigins,
  advanced: {
    database: {
      useNumberId: true,
    },
  },
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      users,
      session: authSessions,
      account: authAccounts,
      verification: authVerifications,
    },
  }),
  databaseHooks: {
    user: {
      create: {
        // 首个注册用户自动成为管理员，并接管此前遗留的存储配置与个人设置
        after: async (createdUser) => {
          const [{ total }] = await db
            .select({ total: sql<number>`count(*)::int` })
            .from(users);
          if (total !== 1) {
            return;
          }
          const userId = Number(createdUser.id);
          const knownUserIds = db.select({ id: users.id }).from(users);
          await db.update(users).set({ role: 'admin' }).where(eq(users.id, userId));
          await db.update(userStorages).set({ userId }).where(notInArray(userStorages.userId, knownUserIds));
          await db.update(userSettings).set({ userId }).where(notInArray(userSettings.userId, knownUserIds));
        },
      },
    },
  },
  user: {
    modelName: 'users',
    fields: {
      image: 'imageUrl',
    },
    additionalFields: {
      role: {
        type: ['user', 'admin'],
        defaultValue: 'user',
        input: false,
      },
    },
  },
  session: {
    modelName: 'session',
  },
  account: {
    modelName: 'account',
  },
  verification: {
    modelName: 'verification',
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
  plugins: [nextCookies()],
});
