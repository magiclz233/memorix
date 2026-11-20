import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { and, eq, like, notInArray, sql } from 'drizzle-orm';
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

// 首信任根保护：外网可达的实例，若库中还没有管理员，公开注册会让抢先访问的人
// 自动成为 admin（见下方 after hook）。配置本变量后，首个用户只允许该邮箱注册；
// 未配置时保持旧行为以兼容已有部署，但会打印告警。运维应把此变量作为部署必填项。
const INIT_ADMIN_EMAIL = (process.env.INIT_ADMIN_EMAIL ?? '').trim().toLowerCase();

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
        // 站点私密时，阻止一切注册（包括绕过 Server Action 的 Better Auth 原生注册端点）
        before: async (user) => {
          // 库中还没有管理员时：首个用户会自动升为 admin（见 after hook）。
          // 若配置了 INIT_ADMIN_EMAIL，只允许该邮箱完成初始化，防止外部抢注接管站点。
          const [{ total }] = await db
            .select({ total: sql<number>`count(*)::int` })
            .from(users)
            .where(eq(users.role, 'admin'));
          if (total === 0) {
            if (INIT_ADMIN_EMAIL) {
              const candidate = (user?.email ?? '').trim().toLowerCase();
              if (candidate !== INIT_ADMIN_EMAIL) {
                console.warn('[auth] First-user registration blocked: email does not match INIT_ADMIN_EMAIL');
                return false;
              }
              return true;
            }
            // 未配置时的兼容降级：打印醒目告警，提示运维尽快设置。
            console.warn(
              '[auth] INIT_ADMIN_EMAIL is not set. The first user to register will become admin. ' +
                'Set INIT_ADMIN_EMAIL before exposing this instance to the internet.',
            );
            return true;
          }

          const settingRows = await db
            .select({ value: userSettings.value })
            .from(userSettings)
            .innerJoin(users, eq(userSettings.userId, users.id))
            .where(
              and(
                eq(users.role, 'admin'),
                like(userSettings.key, 'system_settings_%'),
              ),
            );
          // 只要有任一管理员设置明确关闭 publicAccess，就拒绝注册
          const blocked = settingRows.some((row) => {
            const value = row.value as { publicAccess?: boolean } | null;
            return value && value.publicAccess === false;
          });
          if (blocked) {
            // Better Auth 官方支持的拒绝方式：before hook 返回 false 即中止创建。
            // 相比 throw new Error（会被转成笼统的 422 "Failed to create user"），语义更清晰。
            return false;
          }
          return true;
        },
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
