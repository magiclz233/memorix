import { createLogger } from './logger';
import { db } from './drizzle';
import { errorLogs } from './schema';

const logger = createLogger('error-reporter');

/**
 * 错误上报工具（服务端安全）
 * 记录错误到数据库和日志系统
 */
export class ErrorReporter {
  /**
   * 上报错误
   */
  static async reportError(
    error: Error,
    context?: Record<string, unknown>,
  ): Promise<void> {
    logger.error(
      { message: error.message, stack: error.stack, ...context },
      '错误上报',
    );

    try {
      await db.insert(errorLogs).values({
        level: 'error',
        message: error.message.slice(0, 1000),
        stack: error.stack?.slice(0, 5000) || null,
        context: context ? JSON.parse(JSON.stringify(context)) : null,
        userId: context?.userId ? Number(context.userId) : null,
        requestId: context?.requestId ? String(context.requestId) : null,
      });
    } catch (dbError) {
      logger.error({ dbError }, '写入错误日志到数据库失败');
    }
  }

  /**
   * 上报消息（非错误）
   */
  static async reportMessage(
    message: string,
    level: 'info' | 'warn' | 'error' = 'info',
    context?: Record<string, unknown>,
  ): Promise<void> {
    logger[level]({ ...context }, message);
  }
}
