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
  const redisConfigured = Boolean(process.env.REDIS_URL?.trim());
  const storagePath = process.env.UPLOAD_DIR?.trim();
  const checks: HealthCheckResult['checks'] = {
    database: { status: 'unknown' as 'up' | 'down' },
    redis: {
      status: redisConfigured ? ('unknown' as 'up' | 'down') : 'up',
      configured: redisConfigured,
    },
    storage: {
      status: storagePath ? ('unknown' as 'up' | 'down') : 'up',
      available: Boolean(storagePath),
      configured: Boolean(storagePath),
    },
  };

  // 并行检查所有服务；未配置的可选依赖不参与健康判定
  await Promise.allSettled([
    // 检查数据库
    checkDatabaseConnection().then((result) => {
      checks.database = result;
    }),

    // 检查 Redis
    ...(redisConfigured
      ? [
          cache.ping().then((ok) => {
            checks.redis = { status: ok ? 'up' : 'down', configured: true };
          }),
        ]
      : []),

    // 检查存储（简单检查：存储目录是否可访问）
    ...(storagePath
      ? [
          checkStorageAvailability(storagePath).then((available) => {
            checks.storage = {
              status: available ? 'up' : 'down',
              available,
              configured: true,
            };
          }),
        ]
      : []),
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

async function checkStorageAvailability(uploadDir: string): Promise<boolean> {
  try {
    const { existsSync } = await import('fs');
    // 检查上传目录是否存在
    return existsSync(uploadDir);
  } catch {
    return false;
  }
}
