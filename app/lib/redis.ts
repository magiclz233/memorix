import Redis from 'ioredis';

let redisClient: Redis | null = null;

// 初始化 Redis（如果配置了）
if (process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 200, 1000);
      },
    });

    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis connected');
    });
  } catch (error) {
    console.warn('Redis initialization failed, falling back to no cache:', error);
    redisClient = null;
  }
}

export { redisClient };

/**
 * 缓存工具函数
 * @param key 缓存键
 * @param fallback 降级函数（Redis 不可用时调用）
 * @param ttl 过期时间（秒），默认 300 秒
 */
export async function getCached<T>(
  key: string,
  fallback: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  if (!redisClient) {
    return fallback();
  }

  try {
    const cached = await redisClient.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    const data = await fallback();
    await redisClient.setex(key, ttl, JSON.stringify(data));
    return data;
  } catch (error) {
    console.warn('Redis cache error, using fallback:', error);
    return fallback();
  }
}

/**
 * 删除缓存
 * @param pattern 缓存键模式（支持通配符 *）
 */
export async function deleteCached(pattern: string): Promise<void> {
  if (!redisClient) return;

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (error) {
    console.warn('Redis delete error:', error);
  }
}

/**
 * 设置缓存
 * @param key 缓存键
 * @param value 缓存值
 * @param ttl 过期时间（秒）
 */
export async function setCached<T>(
  key: string,
  value: T,
  ttl: number = 300
): Promise<void> {
  if (!redisClient) return;

  try {
    await redisClient.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.warn('Redis set error:', error);
  }
}
