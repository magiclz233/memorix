import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { config as appConfig } from './config';

const connectionString =
  process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL!;
const sslMode = (process.env.POSTGRES_SSL_MODE ?? 'require').toLowerCase();
const ssl =
  sslMode === 'disable' || sslMode === 'false' || sslMode === '0'
    ? false
    : sslMode === 'prefer' || sslMode === 'verify-full'
      ? sslMode
      : 'require';

const client = postgres(connectionString, {
  ssl,
  max: appConfig.db.poolMax,
  idle_timeout: appConfig.db.idleTimeout,
  connect_timeout: appConfig.db.connectTimeout,
  // 使用预编译语句提升性能
  prepare: true,
  // 忽略 NOTICE 消息
  onnotice: () => {},
});

export const db = drizzle(client, { schema });

/**
 * 检查数据库连接状态
 */
export async function checkDatabaseConnection(): Promise<{
  status: 'up' | 'down';
  latency: number;
}> {
  const start = Date.now();
  try {
    await client`SELECT 1`;
    return { status: 'up', latency: Date.now() - start };
  } catch (error) {
    console.error('Database connection check failed:', error);
    return { status: 'down', latency: Date.now() - start };
  }
}
