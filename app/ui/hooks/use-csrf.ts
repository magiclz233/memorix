'use client';

import { useEffect, useState } from 'react';

/**
 * 获取 CSRF Token 的客户端 Hook
 * 在需要发起状态变更请求的组件中使用
 */
export function useCSRFToken() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/csrf-token')
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data: { token: string } | null) => {
        if (data?.token) setToken(data.token);
      })
      .catch(() => {
        // CSRF Token 获取失败时静默处理
      })
      .finally(() => setLoading(false));
  }, []);

  return { token, loading };
}
