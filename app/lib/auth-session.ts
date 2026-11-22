import { cache } from 'react';
import { headers } from 'next/headers';
import { auth } from '@/auth';

/**
 * 每个请求只查询一次 Better Auth session。
 *
 * dashboard layout 与页面组件都会读取 session；用 React cache 去重后，
 * 同一请求内只产生一次数据库查询 / token 校验，避免 layout + page 重复查询。
 */
export const getRequestSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);
