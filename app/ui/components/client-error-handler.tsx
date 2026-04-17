'use client';

import { useEffect } from 'react';

/**
 * 客户端全局错误处理器
 * 捕获未处理的 JS 错误和 Promise rejection，上报到服务端
 */
export function ClientErrorHandler() {
  useEffect(() => {
    const handleError = async (event: ErrorEvent) => {
      if (!event.error) return;
      try {
        await fetch('/api/analytics/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: event.error?.message || String(event.error),
            stack: event.error?.stack,
            type: 'unhandledError',
            filename: event.filename,
            lineno: event.lineno,
          }),
          keepalive: true,
        });
      } catch {
        // 静默处理
      }
    };

    const handleRejection = async (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
      try {
        await fetch('/api/analytics/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: error.message,
            stack: error.stack,
            type: 'unhandledRejection',
          }),
          keepalive: true,
        });
      } catch {
        // 静默处理
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null;
}
