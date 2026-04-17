import crypto from 'crypto';
import { redisClient } from './redis';
import { AppError } from './errors';
import { createLogger } from './logger';

const logger = createLogger('csrf');

/** CSRF Token 有效期：1 小时 */
const CSRF_TOKEN_TTL = 3600;

/** CSRF Token 缓存键前缀 */
const CSRF_KEY_PREFIX = 'csrf:';

// 内存降级存储
const inMemoryTokens = new Map<string, { token: string; expiresAt: number }>();

/**
 * CSRF 防护工具类
 */
export class CSRFProtection {
  /**
   * 生成并缓存 CSRF Token
   */
  static async generateToken(userId: number): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const key = `${CSRF_KEY_PREFIX}${userId}`;

    if (redisClient) {
      try {
        await redisClient.setex(key, CSRF_TOKEN_TTL, token);
      } catch (error) {
        logger.warn({ userId, error }, 'Redis CSRF token storage failed, using memory');
        inMemoryTokens.set(key, {
          token,
          expiresAt: Date.now() + CSRF_TOKEN_TTL * 1000,
        });
      }
    } else {
      inMemoryTokens.set(key, {
        token,
        expiresAt: Date.now() + CSRF_TOKEN_TTL * 1000,
      });
    }

    return token;
  }

  /**
   * 验证 CSRF Token（使用时间安全比较防止时序攻击）
   */
  static async verifyToken(userId: number, token: string): Promise<boolean> {
    const key = `${CSRF_KEY_PREFIX}${userId}`;
    let storedToken: string | null = null;

    if (redisClient) {
      try {
        storedToken = await redisClient.get(key);
      } catch (error) {
        logger.warn({ userId, error }, 'Redis CSRF token retrieval failed, checking memory');
        const memEntry = inMemoryTokens.get(key);
        if (memEntry && memEntry.expiresAt > Date.now()) {
          storedToken = memEntry.token;
        }
      }
    } else {
      const memEntry = inMemoryTokens.get(key);
      if (memEntry && memEntry.expiresAt > Date.now()) {
        storedToken = memEntry.token;
      }
    }

    if (!storedToken) return false;

    // 使用时间安全比较，防止时序攻击
    try {
      return crypto.timingSafeEqual(
        Buffer.from(storedToken, 'hex'),
        Buffer.from(token, 'hex'),
      );
    } catch {
      return false;
    }
  }

  /**
   * CSRF 中间件验证
   * 对非 GET/HEAD/OPTIONS 请求验证 CSRF Token
   */
  static async middleware(request: Request, userId: number): Promise<void> {
    const method = request.method.toUpperCase();

    // 安全方法不需要 CSRF 验证
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return;

    const token = (request as unknown as { headers: Headers }).headers?.get('x-csrf-token');

    if (!token) {
      throw new AppError('缺少 CSRF Token', 'CSRF_MISSING', 403);
    }

    const isValid = await this.verifyToken(userId, token);

    if (!isValid) {
      logger.warn({ userId }, 'Invalid CSRF token');
      throw new AppError('CSRF Token 无效或已过期', 'CSRF_INVALID', 403);
    }
  }
}

// 定期清理过期的内存 Token
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of inMemoryTokens.entries()) {
    if (entry.expiresAt <= now) {
      inMemoryTokens.delete(key);
    }
  }
}, 60 * 1000);
