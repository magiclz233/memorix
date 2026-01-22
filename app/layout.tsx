import '@/app/ui/global.css';
import {
  plusJakartaSans,
  notoSansSC,
  playfairDisplay,
  notoSerifSC,
} from '@/app/ui/fonts';
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';

export const metadata: Metadata = {
  title: {
    template: '%s | Acme Dashboard',
    default: 'Acme Dashboard',
  },
  description: 'The official Next.js Learn Dashboard built with App Router.',
  metadataBase: new URL('https://next-learn-dashboard.vercel.sh'),
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.variable} ${notoSansSC.variable} ${playfairDisplay.variable} ${notoSerifSC.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
