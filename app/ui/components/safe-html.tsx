'use client';

import { Sanitizer } from '@/app/lib/sanitize';

interface SafeHtmlProps {
  /** 需要渲染的 HTML 字符串 */
  html: string;
  className?: string;
}

/**
 * 安全 HTML 渲染组件
 * 在渲染前自动清理 HTML 内容，防止 XSS 攻击
 */
export function SafeHtml({ html, className }: SafeHtmlProps) {
  const sanitized = Sanitizer.sanitizeHtml(html);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
