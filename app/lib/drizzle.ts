import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString =
  process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL!;

const client = postgres(connectionString, {
  ssl: 'require',
  connect_timeout: 15, // 增加连接超时时间
  idle_timeout: 15,
  max: 10,
});
export const db = drizzle(client, { schema });
