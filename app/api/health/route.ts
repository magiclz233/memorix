import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/app/lib/drizzle';
import { cache } from '@/app/lib/cache';
import type { HealthCheckResult } from '@/app/lib/definitions';

/**
 * 健康检查端点
 * 检查数据库、Redis、存储源的连接状态
 * 全部健康返回 200，否则返回 503
 */
export async function GET() {
  const checks: HealthCheckResult['checks'] = {
    database: { status: 'unknown' as 'up' | 'down' },
    redis: { status: 'unknown' as 'up' | 'down' },
    storage: { status: 'unknown' as 'up' | 'down', available: false },
  };

  // 并行检查所有服务
  await Promise.allSettled([
    // 检查数据库
    checkDatabaseConnection().then((result) => {
      checks.database = result;
    }),

    // 检查 Redis
    cache.ping().then((ok) => {
      checks.redis = { status: ok ? 'up' : 'down' };
    }),

    // 检查存储（简单检查：存储目录是否可访问）
    checkStorageAvailability().then((available) => {
      checks.storage = { status: available ? 'up' : 'down', available };
    }),
  ]);

  const allHealthy = Object.values(checks).every((c) => c.status === 'up');
  const status: HealthCheckResult['status'] = allHealthy ? 'healthy' : 'degraded';

  const result: HealthCheckResult = {
    status,
    checks,
    timestamp: new Date(),
  };

  return NextResponse.json(result, {
    status: allHealthy ? 200 : 503,
  });
}

async function checkStorageAvailability(): Promise<boolean> {
  try {
    const { existsSync } = await import('fs');
    // 检查上传目录是否存在
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    return existsSync(uploadDir);
  } catch {
    return false;
  }
}
