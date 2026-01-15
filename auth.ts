import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { db } from '@/app/lib/drizzle';
import {
  authAccounts,
  authSessions,
  authVerifications,
  users,
} from '@/app/lib/schema';

export const auth = betterAuth({
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
