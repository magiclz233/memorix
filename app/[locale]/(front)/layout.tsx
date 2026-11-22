import type { ReactNode } from 'react';
import { FrontShell } from '@/app/ui/front/front-shell';
import { config } from '@/app/lib/config';

type FrontLayoutProps = {
  children: ReactNode;
};

export default function FrontLayout({ children }: FrontLayoutProps) {
  return (
    <FrontShell minPasswordLength={config.auth.minPasswordLength}>
      {children}
    </FrontShell>
  );
}
