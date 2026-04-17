'use client';

import { useEffect } from 'react';

interface VitalsMetric {
  id: string;
  name: string;
  value: number;
  rating?: string;
  delta?: number;
  navigationType?: string;
}

/**
 * 上报 Web Vitals 指标到服务端
 */
function sendToAnalytics(metric: VitalsMetric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    page: window.location.pathname,
    userAgent: navigator.userAgent,
  });

  // 使用 sendBeacon 确保页面卸载时数据也能发送
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/vitals', body);
  } else {
    fetch('/api/analytics/vitals', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {});
  }
}

/**
 * Web Vitals 收集组件
 * 收集 CLS、FID、FCP、LCP、TTFB 指标并上报
 */
export function WebVitalsReporter() {
  useEffect(() => {
    // 动态导入 web-vitals，避免影响首屏加载
    import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
      onCLS(sendToAnalytics);
      onFID(sendToAnalytics);
      onFCP(sendToAnalytics);
      onLCP(sendToAnalytics);
      onTTFB(sendToAnalytics);
    }).catch(() => {
      // web-vitals 未安装时静默失败
    });
  }, []);

  return null;
}
