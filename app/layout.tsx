import '@/app/ui/global.css';
import '@/app/ui/fonts'; // 导入 fontsource 字体 CSS
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { fetchPublicSystemSettings } from '@/app/lib/data';
import { resolveSiteDescription, resolveSiteName } from '@/app/lib/site-brand';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  let settings = null;
  try {
    settings = await fetchPublicSystemSettings(locale);
  } catch {
    settings = null;
  }

  const siteName = resolveSiteName(settings?.siteName);
  const description = resolveSiteDescription(settings?.seoDescription, locale);

  return {
    title: {
      template: `%s | ${siteName}`,
      default: siteName,
    },
    description,
    metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com'),
    openGraph: {
      type: 'website',
      locale: locale === 'en' ? 'en_US' : 'zh_CN',
      alternateLocale: locale === 'en' ? ['zh_CN'] : ['en_US'],
      siteName,
    },
    twitter: {
      card: 'summary_large_image',
    },
    alternates: {
      canonical: '/',
      languages: {
        'zh-CN': '/',
        en: '/en',
      },
    },
  };
}

// 全环境主动注销历史遗留 Service Worker 并清理 lumina-* 缓存，
// 防止旧 SW 对 /api/media/thumb/* 与后台页面做不当缓存（遵循 ADR-0001）。
const serviceWorkerCleanupScript = `
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      var cleanup = [
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
          return Promise.all(registrations.map(function(registration) {
            return registration.unregister();
          }));
        })
      ];

      if ('caches' in window) {
        cleanup.push(
          caches.keys().then(function(keys) {
            return Promise.all(keys.filter(function(key) {
              return key.indexOf('lumina-') === 0;
            }).map(function(key) {
              return caches.delete(key);
            }));
          })
        );
      }

      Promise.all(cleanup).then(function() {
        if (navigator.serviceWorker.controller && sessionStorage.getItem('lumina-sw-cleaned') !== '1') {
          sessionStorage.setItem('lumina-sw-cleaned', '1');
          window.location.reload();
        }
      });
    });
  }
`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="font-sans font-normal antialiased">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: serviceWorkerCleanupScript,
          }}
        />
      </body>
    </html>
  );
}
