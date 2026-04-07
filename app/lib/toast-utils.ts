'use client';

import { useTranslations } from 'next-intl';
import { toast, type ExternalToast } from 'sonner';

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastOptions = {
  id?: string | number;
  description?: string;
  duration?: number;
  action?: ToastAction;
};

function buildOptions(options?: ToastOptions): ExternalToast {
  if (!options) return {};

  return {
    id: options.id,
    description: options.description,
    duration: options.duration,
    action: options.action
      ? {
          label: options.action.label,
          onClick: options.action.onClick,
        }
      : undefined,
  };
}

export function showSuccess(message: string, options?: ToastOptions) {
  return toast.success(message, buildOptions(options));
}

export function showError(message: string, options?: ToastOptions) {
  return toast.error(message, buildOptions(options));
}

export function showWarning(message: string, options?: ToastOptions) {
  return toast.warning(message, buildOptions(options));
}

export function showInfo(message: string, options?: ToastOptions) {
  return toast.info(message, buildOptions(options));
}

export function showLoading(message: string, options?: ToastOptions) {
  return toast.loading(message, buildOptions(options));
}

export function dismissToast(id?: string | number) {
  toast.dismiss(id);
}

export function useToastI18n(namespace = 'common.toasts') {
  const t = useTranslations(namespace as never);

  return {
    showSuccess: (key: string, options?: ToastOptions) =>
      showSuccess(t(key as never), options),
    showError: (key: string, options?: ToastOptions) =>
      showError(t(key as never), options),
    showWarning: (key: string, options?: ToastOptions) =>
      showWarning(t(key as never), options),
    showInfo: (key: string, options?: ToastOptions) =>
      showInfo(t(key as never), options),
    showLoading: (key: string, options?: ToastOptions) =>
      showLoading(t(key as never), options),
  };
}
