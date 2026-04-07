'use client';

import { AppProgressBar } from 'next-nprogress-bar';

export function ProgressBar() {
  return (
    <AppProgressBar
      color="#6366f1"
      height="2px"
      options={{ showSpinner: false }}
      shallowRouting
    />
  );
}
