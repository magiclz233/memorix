'use client';

import { useDebounce } from 'use-debounce';

export function useThrottle<T>(value: T, delay = 100): T {
  const [throttledValue] = useDebounce(value, delay, { maxWait: delay });
  return throttledValue;
}