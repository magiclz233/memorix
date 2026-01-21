import type { ReactNode } from 'react';
import { FrontShell } from '@/app/ui/front/front-shell';

type FrontLayoutProps = {
  children: ReactNode;
};

export default function FrontLayout({ children }: FrontLayoutProps) {
  return <FrontShell>{children}</FrontShell>;
}
