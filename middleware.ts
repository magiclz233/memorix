import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// next-intl 国际化中间件
const intlMiddleware = createMiddleware(routing);

/**
 * 添加安全响应头
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // 防止点击劫持
  response.headers.set('X-Frame-Options', 'DENY');
  // 防止 MIME 类型嗅探
  response.headers.set('X-Content-Type-Options', 'nosniff');
  // XSS 防护（旧浏览器）
  response.headers.set('X-XSS-Protection', '1; mode=block');
  // 引用策略
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // 权限策略
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), payment=()',
  );
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js 需要 unsafe-inline/eval
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "media-src 'self' blob: https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  );

  return response;
}

export function middleware(request: NextRequest) {
  // 对 API 路由直接添加安全头，不走 intl 中间件
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  // 其他路由走 next-intl 中间件，再添加安全头
  const response = intlMiddleware(request);
  return addSecurityHeaders(response as NextResponse);
}

export const config = {
  matcher: [
    // 匹配所有路径，排除静态资源和 _next 内部路径
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
