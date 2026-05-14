import '@/app/ui/global.css';
import '@/app/ui/fonts'; // 导入 fontsource 字体 CSS
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';

export const metadata: Metadata = {
  title: {
    template: '%s | Lumina Pro',
    default: 'Lumina Pro',
  },
  description: 'Lumina Pro - 沉浸式光影与极简排版的视觉档案系统',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com'),
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    alternateLocale: ['en_US'],
    siteName: 'Lumina Pro',
  },
  twitter: {
    card: 'summary_large_image',
  },
  alternates: {
    canonical: '/',
    languages: {
      'zh-CN': '/',
      'en': '/en',
    },
  },
};

const serviceWorkerScript =
  process.env.NODE_ENV === 'production'
    ? `
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
          navigator.serviceWorker.register('/sw.js').catch(function() {});
        });
      }
    `
    : `
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
      <body className="font-sans font-medium antialiased">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: serviceWorkerScript,
          }}
        />
      </body>
    </html>
  );
}
