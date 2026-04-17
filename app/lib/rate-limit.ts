import { redisClient } from './redis';
import type { RateLimitConfig, RateLimitInfo } from './definitions';
import { RateLimitError } from './errors';

// 内存存储（Redis 不可用时的降级方案）
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

/**
 * 基础速率限制检查（内部使用）
 */
async function checkRateLimitInternal(
  identifier: string,
  limit: number = 10,
  windowSeconds: number = 60,
): Promise<{ success: boolean; remaining: number }> {
  const key = `rate-limit:${identifier}`;

  if (redisClient) {
    try {
      const current = await redisClient.incr(key);
      if (current === 1) {
        await redisClient.expire(key, windowSeconds);
      }
      const remaining = Math.max(0, limit - current);
      return { success: current <= limit, remaining };
    } catch (error) {
      console.warn('Redis rate limit error, allowing request:', error);
      return { success: true, remaining: limit };
    }
  }

  // 降级到内存存储
  const now = Date.now();
  const record = inMemoryStore.get(key);

  if (!record || now > record.resetAt) {
    inMemoryStore.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { success: true, remaining: limit - 1 };
  }

  record.count++;
  const remaining = Math.max(0, limit - record.count);
  return { success: record.count <= limit, remaining };
}

/**
 * 重置速率限制
 */
export async function resetRateLimit(identifier: string): Promise<void> {
  const key = `rate-limit:${identifier}`;
  if (redisClient) {
    try {
      await redisClient.del(key);
    } catch (error) {
      console.warn('Redis reset rate limit error:', error);
    }
  } else {
    inMemoryStore.delete(key);
  }
}

/**
 * 预定义速率限制配置
 */
export const RateLimits = {
  /** 登录接口：每分钟最多 5 次 */
  login: { windowMs: 60 * 1000, maxRequests: 5 } satisfies RateLimitConfig,
  /** 上传接口：每分钟最多 20 次 */
  upload: { windowMs: 60 * 1000, maxRequests: 20 } satisfies RateLimitConfig,
  /** 搜索接口：每分钟最多 30 次 */
  search: { windowMs: 60 * 1000, maxRequests: 30 } satisfies RateLimitConfig,
  /** 通用 API：每分钟最多 100 次 */
  api: { windowMs: 60 * 1000, maxRequests: 100 } satisfies RateLimitConfig,
} as const;

/**
 * 基于滑动窗口算法的速率限制器
 */
export class RateLimiter {
  /**
   * 检查速率限制，超限时抛出 RateLimitError
   */
  static async check(
    identifier: string,
    endpoint: string,
    config: RateLimitConfig,
  ): Promise<RateLimitInfo> {
    const key = `ratelimit:${endpoint}:${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    if (redisClient) {
      try {
        const pipeline = redisClient.pipeline();
        pipeline.zremrangebyscore(key, '-inf', windowStart);
        pipeline.zadd(key, now, `${now}-${Math.random()}`);
        pipeline.zcard(key);
        pipeline.pexpire(key, config.windowMs);
        const results = await pipeline.exec();

        const count = (results?.[2]?.[1] as number) ?? 0;

        if (count > config.maxRequests) {
          throw new RateLimitError('请求过于频繁，请稍后再试');
        }

        return {
          remaining: Math.max(0, config.maxRequests - count),
          resetAt: new Date(now + config.windowMs),
          limit: config.maxRequests,
        };
      } catch (error) {
        if (error instanceof RateLimitError) throw error;
        console.warn('RateLimiter Redis error, allowing request:', error);
        return {
          remaining: config.maxRequests,
          resetAt: new Date(now + config.windowMs),
          limit: config.maxRequests,
        };
      }
    }

    // 降级到内存存储
    const result = await checkRateLimitInternal(
      `${endpoint}:${identifier}`,
      config.maxRequests,
      Math.ceil(config.windowMs / 1000),
    );

    if (!result.success) {
      throw new RateLimitError('请求过于频繁，请稍后再试');
    }

    return {
      remaining: result.remaining,
      resetAt: new Date(now + config.windowMs),
      limit: config.maxRequests,
    };
  }
}

/**
 * 从请求中提取客户端标识符（IP 地址）
 * Vercel 使用 x-forwarded-for 传递真实 IP
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = (request as unknown as { headers: Headers }).headers?.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return 'unknown';
}
