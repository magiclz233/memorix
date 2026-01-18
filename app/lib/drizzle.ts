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
  connect_timeout: 15, // 增加连接超时时间
  idle_timeout: 15,
  max: 10,
});
export const db = drizzle(client, { schema });
