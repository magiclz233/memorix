import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ThemeProvider } from '@/components/theme-provider';
import { AppToaster } from '@/app/ui/components/app-toaster';
import { GlobalErrorBoundary } from '@/app/ui/components/error-boundary';
import { ProgressBar } from '@/app/ui/components/progress-bar';
import { routing } from '@/i18n/routing';

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <ThemeProvider>
        <GlobalErrorBoundary>{children}</GlobalErrorBoundary>
        <AppToaster />
        <ProgressBar />
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
