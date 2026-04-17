import { createLogger } from './logger';

const logger = createLogger('db-monitor');

/** 慢查询阈值（毫秒），默认 3 秒 */
const DEFAULT_SLOW_QUERY_THRESHOLD = 3000;

/**
 * 慢查询监控高阶函数
 * 包裹数据库查询，记录执行时间，超过阈值时记录警告日志
 *
 * @param queryName 查询名称（用于日志标识）
 * @param threshold 慢查询阈值（毫秒），默认 3000ms
 */
export function monitorQuery<T>(
  queryName: string,
  threshold: number = DEFAULT_SLOW_QUERY_THRESHOLD,
) {
  return async (queryFn: () => Promise<T>): Promise<T> => {
    const startTime = Date.now();

    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;

      if (duration > threshold) {
        logger.warn(
          { queryName, duration, threshold },
          `慢查询检测: ${queryName} 耗时 ${duration}ms（阈值 ${threshold}ms）`,
        );
      } else {
        logger.debug({ queryName, duration }, `查询完成: ${queryName}`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
        { queryName, duration, error },
        `查询失败: ${queryName}`,
      );
      throw error;
    }
  };
}

/**
 * 便捷包装：直接执行并监控查询
 */
export async function withQueryMonitor<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  threshold?: number,
): Promise<T> {
  return monitorQuery<T>(queryName, threshold)(queryFn);
}
