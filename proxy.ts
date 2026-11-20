import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { auth } from '@/auth';
import { routing } from '@/i18n/routing';

const intlMiddleware = createMiddleware(routing);
const escapedLocales = routing.locales.map((locale) =>
  locale.replace(/[-/\\^$*+?.()|[\]{}]/g, String.raw`\$&`),
);
const localePattern = escapedLocales.join('|');
const localeRegex = new RegExp(`^/(${localePattern})(?:/|$)`);
const dashboardRegex = new RegExp(`^/(${localePattern})/dashboard(?:/|$)`);

function getLocaleFromPathname(pathname: string) {
  const match = pathname.match(localeRegex);
  return match ? match[1] : routing.defaultLocale;
}

/**
 * 添加安全响应头
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), payment=()',
  );
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "media-src 'self' blob: https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),
  );
  return response;
}

/**
 * 对 API 写操作做 CSRF 防护。
 *
 * 原则：
 * 1. 浏览器发起的跨站写请求（携带外部 Origin / Sec-Fetch-Site）必须拒绝。
 * 2. 同源浏览器请求：Origin 的 host 必须等于请求到达的 host，或命中显式配置的可信来源。
 * 3. 非浏览器调用（curl / 服务端脚本 / 外部 agent 用 Bearer token）：这类请求不会自动携带
 *    浏览器 Cookie，不构成 CSRF；始终放行，由各路由自身的 session / token 鉴权兜底。
 *    绝不能因为「无 Origin」就一律 403，否则会误杀所有合法的服务端调用。
 *
 * 安全要点：不使用 x-forwarded-host 作为判据——该头客户端可伪造，攻击者同时伪造
 * Origin 与 X-Forwarded-Host 即可骗过相等比较。改用 Next 已解析的 nextUrl.host；
 * 反代（UGLink）改写 Host 的场景由 BETTER_AUTH_TRUSTED_ORIGINS 显式白名单解决。
 */
function isAllowedApiWrite(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const secFetchSite = request.headers.get('sec-fetch-site');

  // 非浏览器请求：没有 Origin 也没有浏览器 Fetch 元数据头。
  // 浏览器对所有写方法（POST/PUT/PATCH/DELETE）都会带 Origin，并带 Sec-Fetch-* 头。
  // 这类请求无法被用于 CSRF（不会自动附带会话 Cookie），放行给路由层鉴权。
  if (!origin && !secFetchSite) return true;

  // 明确的跨站浏览器请求：直接拒绝。
  if (secFetchSite === 'cross-site') return false;

  // 到这里说明是浏览器请求：必须有合法 Origin。
  if (!origin) return false;
  try {
    const originUrl = new URL(origin);
    const originHost = originUrl.host.toLowerCase();
    // 用 nextUrl.host（Next 从实际请求 Host 解析），不信任客户端可控的 x-forwarded-host。
    const requestHost = request.nextUrl.host.toLowerCase();
    if (originHost === requestHost) return true;

    // 反向代理（如绿联 UGLink）：到达容器的 Host 是内网地址，Origin 是外网域名。
    // 此时信任显式配置的可信来源（与 auth.ts / next.config.ts 的 trustedOrigins 一致）。
    const trusted = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    return trusted.some((trustedOrigin) => {
      try {
        const allowed = new URL(trustedOrigin);
        return allowed.protocol === originUrl.protocol && allowed.host === originHost;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // API 写操作：同源校验，不经过 next-intl 的重写逻辑
  if (pathname.startsWith('/api/')) {
    const method = request.method.toUpperCase();
    const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    const isExempt =
      pathname.startsWith('/api/cron/') || pathname.startsWith('/api/auth/');
    if (isWrite && !isExempt && !isAllowedApiWrite(request)) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Forbidden: invalid origin' }, { status: 403 }),
      );
    }
    return addSecurityHeaders(NextResponse.next());
  }

  const intlResponse = intlMiddleware(request);
  const hasIntlRewrite =
    intlResponse.headers.get('location') ||
    intlResponse.headers.get('x-middleware-rewrite');

  if (hasIntlRewrite) {
    return addSecurityHeaders(intlResponse as NextResponse);
  }

  if (!dashboardRegex.test(pathname)) {
    return addSecurityHeaders(intlResponse as NextResponse);
  }

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    const locale = getLocaleFromPathname(pathname);
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set(
      'callbackUrl',
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  if (session.user.role !== 'admin') {
    const locale = getLocaleFromPathname(pathname);
    return NextResponse.redirect(new URL(`/${locale}/gallery`, request.url));
  }

  return addSecurityHeaders(intlResponse as NextResponse);
}

export const config = {
  // 包含 /api 以便对写操作做同源校验；静态资源、_next、seed 仍排除
  matcher: ['/((?!_next|_vercel|.*\\..*|seed).*)'],
};
