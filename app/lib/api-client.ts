'use client';

﻿import { showError } from '@/app/lib/toast-utils';

export class ApiClientError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.data = data;
  }
}

type RequestOptions = RequestInit & {
  timeoutMs?: number;
  retries?: number;
};

export class ApiClient {
  constructor(private readonly baseUrl = '') {}

  async request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const { timeoutMs = 15000, retries = 3, ...init } = options;
    return this.withRetry<T>(() => this.fetchOnce<T>(url, init, timeoutMs), retries);
  }

  get<T>(url: string, options?: RequestOptions) {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  post<T>(url: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    retries: number,
  ): Promise<T> {
    let attempt = 0;
    let lastError: unknown;

    while (attempt < retries) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        attempt += 1;

        const shouldRetry =
          error instanceof ApiClientError
            ? error.status >= 500 || error.status === 408
            : true;

        if (!shouldRetry || attempt >= retries) {
          break;
        }

        const backoffMs = Math.min(1000 * 2 ** (attempt - 1), 4000);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Request failed');
  }

  private async fetchOnce<T>(
    url: string,
    init: RequestInit,
    timeoutMs: number,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(this.baseUrl + url, {
        ...init,
        signal: controller.signal,
      });

      const isJson = response.headers
        .get('content-type')
        ?.includes('application/json');
      const payload = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const message = this.resolveHttpMessage(response.status);

        if (typeof window !== 'undefined') {
          showError(message);
          if (response.status === 401) {
            window.location.href = '/login';
          }
        }

        throw new ApiClientError(message, response.status, payload);
      }

      return payload as T;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        const timeoutError = new ApiClientError('请求超时，请稍后重试', 408);
        if (typeof window !== 'undefined') {
          showError(timeoutError.message);
        }
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private resolveHttpMessage(status: number) {
    if (status === 401) return '登录已过期，请重新登录';
    if (status === 403) return '权限不足，无法执行该操作';
    if (status === 404) return '请求的资源不存在';
    if (status >= 500) return '服务器开小差了，请稍后重试';
    return '请求失败，请稍后重试';
  }
}

export const apiClient = new ApiClient();
