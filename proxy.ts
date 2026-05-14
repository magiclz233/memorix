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

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

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
  matcher: ['/((?!api|_next|_vercel|.*\\..*|seed).*)'],
};
