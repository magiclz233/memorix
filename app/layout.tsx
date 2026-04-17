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
        {/* Service Worker 注册 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
