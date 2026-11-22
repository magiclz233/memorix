import { redisClient } from './redis';
import { createLogger } from './logger';

const logger = createLogger('cache');

/** Redis 尚未 ready 时直接走降级，避免离线队列关闭后每条命令都报错。 */
const getReadyRedis = () =>
  redisClient?.status === 'ready' ? redisClient : null;

/**
 * Redis 缓存管理器
 * 实现 Cache-Aside 模式，Redis 不可用时自动降级
 */
class CacheManager {
  /**
   * 获取缓存
   */
  async get<T>(key: string): Promise<T | null> {
    const client = getReadyRedis();
    if (!client) return null;

    try {
      const value = await client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      logger.warn({ key, error }, 'Cache get error');
      return null;
    }
  }

  /**
   * 设置缓存
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const client = getReadyRedis();
    if (!client) return;

    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await client.setex(key, ttl, serialized);
      } else {
        await client.set(key, serialized);
      }
    } catch (error) {
      logger.warn({ key, error }, 'Cache set error');
    }
  }

  /**
   * 删除缓存（支持单个键或多个键）
   */
  async del(key: string | string[]): Promise<void> {
    const client = getReadyRedis();
    if (!client) return;

    try {
      if (Array.isArray(key)) {
        if (key.length > 0) await client.del(...key);
      } else {
        await client.del(key);
      }
    } catch (error) {
      logger.warn({ key, error }, 'Cache delete error');
    }
  }

  /**
   * 按模式批量删除缓存（使用 SCAN 避免阻塞 Redis）
   * 例如：delPattern('gallery:list:*') 清除所有画廊列表缓存
   */
  async delPattern(pattern: string): Promise<void> {
    const client = getReadyRedis();
    if (!client) return;

    try {
      let cursor = '0';
      let totalDeleted = 0;
      do {
        const [nextCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          await client.del(...keys);
          totalDeleted += keys.length;
        }
      } while (cursor !== '0');
      if (totalDeleted > 0) {
        logger.debug({ pattern, count: totalDeleted }, 'Cache pattern deleted');
      }
    } catch (error) {
      logger.warn({ pattern, error }, 'Cache delete pattern error');
    }
  }

  /**
   * Cache-Aside 包装器
   * 先查缓存，未命中则执行 fetcher 并写入缓存
   */
  async wrap<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
    // 1. 尝试从缓存获取
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // 2. 缓存未命中，执行查询
    const data = await fetcher();

    // 3. 写入缓存
    await this.set(key, data, ttl);

    return data;
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<{ hits: number; misses: number; hitRate: number } | null> {
    const client = getReadyRedis();
    if (!client) return null;

    try {
      const info = await client.info('stats');
      const lines = info.split('\r\n');
      const stats: Record<string, string> = {};

      lines.forEach((line) => {
        const [key, value] = line.split(':');
        if (key && value) stats[key.trim()] = value.trim();
      });

      const hits = parseInt(stats.keyspace_hits || '0');
      const misses = parseInt(stats.keyspace_misses || '0');
      const total = hits + misses;

      return {
        hits,
        misses,
        hitRate: total > 0 ? (hits / total) * 100 : 0,
      };
    } catch (error) {
      logger.warn({ error }, 'Cache stats error');
      return null;
    }
  }

  /**
   * 检查 Redis 连接状态
   */
  async ping(): Promise<boolean> {
    const client = getReadyRedis();
    if (!client) return false;

    try {
      const result = await client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}

export const cache = new CacheManager();
