import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});

/**
 * 性能追踪装饰器
 */
export function withTiming<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  return fn().finally(() => {
    const duration = Date.now() - start;
    logger.info({ name, duration }, 'Operation completed');
  });
}

/**
 * 创建子日志器
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

/**
 * 日志上下文类型
 */
export type LogContext = {
  userId?: number;
  storageId?: number;
  fileId?: number;
  uploadId?: string;
  [key: string]: unknown;
};

/**
 * 记录操作日志
 */
export function logOperation(
  operation: string,
  context: LogContext,
  message?: string,
) {
  logger.info({ operation, ...context }, message || operation);
}

/**
 * 记录错误日志
 */
export function logError(
  operation: string,
  error: unknown,
  context?: LogContext,
) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorStack = error instanceof Error ? error.stack : undefined;

  logger.error(
    {
      operation,
      error: errorMessage,
      stack: errorStack,
      ...context,
    },
    `${operation} failed`,
  );
}

/**
 * 记录警告日志
 */
export function logWarning(
  operation: string,
  message: string,
  context?: LogContext,
) {
  logger.warn({ operation, ...context }, message);
}

/**
 * 记录调试日志
 */
export function logDebug(
  operation: string,
  message: string,
  context?: LogContext,
) {
  logger.debug({ operation, ...context }, message);
}
