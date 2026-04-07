'use client';

import React, { type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type BoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
};

type BoundaryState = {
  hasError: boolean;
  error: Error | null;
};

class BaseErrorBoundary extends React.Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
        <h2 className="text-lg font-semibold">页面发生错误</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          请刷新页面后重试。如果问题持续，请联系管理员。
        </p>
        {process.env.NODE_ENV === 'development' && this.state.error?.message ? (
          <pre className="mt-3 overflow-auto rounded-md bg-zinc-100 p-3 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            {this.state.error.message}
          </pre>
        ) : null}
        <div className="mt-4 flex gap-2">
          <Button onClick={this.reset} variant="outline">
            重试
          </Button>
          <Button onClick={() => window.location.reload()}>刷新页面</Button>
        </div>
      </div>
    );
  }
}

export function ErrorBoundary({
  children,
  fallback,
  onError,
}: BoundaryProps) {
  return (
    <BaseErrorBoundary fallback={fallback} onError={onError}>
      {children}
    </BaseErrorBoundary>
  );
}

export function GlobalErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error) => {
        console.error('[GlobalErrorBoundary]', error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
