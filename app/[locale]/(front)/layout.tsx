import type { ReactNode } from 'react';
import { getLocale } from 'next-intl/server';
import { FrontShell } from '@/app/ui/front/front-shell';
import { config } from '@/app/lib/config';
import { fetchPublicSystemSettings } from '@/app/lib/data';
import { resolveSiteName } from '@/app/lib/site-brand';

type FrontLayoutProps = {
  children: ReactNode;
};

export default async function FrontLayout({ children }: FrontLayoutProps) {
  const locale = await getLocale();
  let settings = null;
  try {
    settings = await fetchPublicSystemSettings(locale);
  } catch {
    settings = null;
  }
  const siteName = resolveSiteName(settings?.siteName);

  return (
    <FrontShell
      minPasswordLength={config.auth.minPasswordLength}
      siteName={siteName}
    >
      {children}
    </FrontShell>
  );
}
