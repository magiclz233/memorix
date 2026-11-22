import Redis from 'ioredis';

/**
 * 开发环境 HMR / 多次模块加载会重复执行本模块，用 globalThis 复用同一个连接，
 * 避免每个热更新都新建一条 Redis 连接。
 */
const globalForRedis = globalThis as typeof globalThis & {
  __memorixRedis?: Redis | null;
};

function createRedisClient(url: string): Redis {
  const client = new Redis(url, {
    // 单次请求最多重试 2 次，失败后由 cache 层降级，不阻塞页面。
    maxRetriesPerRequest: 2,
    // 永久重连（上限 3s）：NAS/网络短暂抖动后缓存能自动恢复，
    // 而不是像旧配置一样在第 3 次后彻底放弃。
    retryStrategy: (times) => Math.min(times * 200, 3000),
    connectTimeout: 5000,
    keepAlive: 5000,
    // Redis 不可用时命令立即失败，cache 层 catch 后走 DB fallback。
    enableOfflineQueue: false,
  });

  client.on('error', (err) => {
    console.error('Redis connection error:', err.message);
  });

  client.on('connect', () => {
    console.log('Redis connected');
  });

  return client;
}

let redisClient: Redis | null = null;

if (process.env.REDIS_URL) {
  try {
    redisClient =
      globalForRedis.__memorixRedis ?? createRedisClient(process.env.REDIS_URL);
    globalForRedis.__memorixRedis = redisClient;
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
  if (redisClient?.status !== 'ready') {
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
 * 使用 SCAN 迭代删除匹配模式的缓存键（避免 KEYS 的 O(N) 阻塞）
 * @param pattern 缓存键模式（支持通配符 *）
 */
export async function deleteCached(pattern: string): Promise<void> {
  if (redisClient?.status !== 'ready') return;

  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redisClient.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } while (cursor !== '0');
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
  if (redisClient?.status !== 'ready') return;

  try {
    await redisClient.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.warn('Redis set error:', error);
  }
}
