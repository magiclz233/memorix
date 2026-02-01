import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { auth } from '@/auth';
import { routing } from '@/i18n/routing';

const intlMiddleware = createMiddleware(routing);
const escapedLocales = routing.locales.map((locale) =>
  locale.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'),
);
const localePattern = escapedLocales.join('|');
const localeRegex = new RegExp(`^/(${localePattern})(?:/|$)`);
const dashboardRegex = new RegExp(`^/(${localePattern})/dashboard(?:/|$)`);

function getLocaleFromPathname(pathname: string) {
  const match = pathname.match(localeRegex);
  return match ? match[1] : routing.defaultLocale;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const intlResponse = intlMiddleware(request);
  const hasIntlRewrite =
    intlResponse.headers.get('location') ||
    intlResponse.headers.get('x-middleware-rewrite');

  if (hasIntlRewrite) {
    return intlResponse;
  }

  if (!dashboardRegex.test(pathname)) {
    return intlResponse;
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

  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*|seed).*)'],
};
