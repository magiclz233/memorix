export type UploadRetryOptions = {
  maxRetries?: number;
  baseDelay?: number;
  onRetry?: (attempt: number, maxRetries: number, error: unknown) => void;
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function uploadWithRetry<T>(
  request: (attempt: number) => Promise<T>,
  options?: UploadRetryOptions,
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelay = options?.baseDelay ?? 1000;

  let attempt = 0;

  while (true) {
    attempt += 1;

    try {
      return await request(attempt);
    } catch (error) {
      if (attempt >= maxRetries) {
        throw error;
      }

      options?.onRetry?.(attempt, maxRetries, error);
      const delay = Math.pow(2, attempt) * baseDelay;
      await sleep(delay);
    }
  }
}