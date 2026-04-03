import { redisClient } from './redis';

// 内存存储（Redis 不可用时的降级方案）
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

/**
 * 速率限制检查
 * @param identifier 标识符（如 userId、IP 地址）
 * @param limit 限制次数
 * @param windowSeconds 时间窗口（秒）
 * @returns { success: 是否通过限制, remaining: 剩余次数 }
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowSeconds: number = 60
): Promise<{ success: boolean; remaining: number }> {
  const key = `rate-limit:${identifier}`;

  if (redisClient) {
    // 使用 Redis
    try {
      const current = await redisClient.incr(key);
      if (current === 1) {
        await redisClient.expire(key, windowSeconds);
      }

      const remaining = Math.max(0, limit - current);
      return {
        success: current <= limit,
        remaining,
      };
    } catch (error) {
      console.warn('Redis rate limit error, allowing request:', error);
      return { success: true, remaining: limit };
    }
  } else {
    // 降级到内存存储
    const now = Date.now();
    const record = inMemoryStore.get(key);

    if (!record || now > record.resetAt) {
      inMemoryStore.set(key, {
        count: 1,
        resetAt: now + windowSeconds * 1000,
      });
      return { success: true, remaining: limit - 1 };
    }

    record.count++;
    const remaining = Math.max(0, limit - record.count);
    return {
      success: record.count <= limit,
      remaining,
    };
  }
}

/**
 * 重置速率限制
 * @param identifier 标识符
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

// 清理内存存储（定时任务）
if (!redisClient) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of inMemoryStore.entries()) {
      if (now > record.resetAt) {
        inMemoryStore.delete(key);
      }
    }
  }, 60000); // 每分钟清理一次
}
