import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

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
  // 最大连接数：20（生产环境）
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  // 空闲超时：20 秒
  idle_timeout: 20,
  // 连接超时：10 秒
  connect_timeout: 10,
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
