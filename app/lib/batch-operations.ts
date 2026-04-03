'use client';

import { toast } from 'sonner';

export type BatchOperationProgress = {
  total: number;
  completed: number;
  failed: number;
  current?: string;
};

export type BatchOperationResult = {
  success: boolean;
  completed: number;
  failed: number;
  errors?: Array<{ id: number | string; error: string }>;
};

/**
 * 执行批量操作并显示进度
 */
export async function executeBatchOperation<T>(
  items: T[],
  operation: (item: T) => Promise<void>,
  options: {
    operationName: string;
    getItemLabel?: (item: T) => string;
    onProgress?: (progress: BatchOperationProgress) => void;
    batchSize?: number;
  },
): Promise<BatchOperationResult> {
  const { operationName, getItemLabel, onProgress, batchSize = 5 } = options;

  const toastId = toast.loading(`${operationName}: 0 / ${items.length}`);

  const result: BatchOperationResult = {
    success: true,
    completed: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Process in batches
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async (item) => {
          try {
            const label = getItemLabel?.(item);
            onProgress?.({
              total: items.length,
              completed: result.completed,
              failed: result.failed,
              current: label,
            });

            await operation(item);
            result.completed++;

            // Update toast
            toast.loading(
              `${operationName}: ${result.completed} / ${items.length}`,
              { id: toastId },
            );
          } catch (error) {
            result.failed++;
            result.success = false;

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            result.errors?.push({
              id: getItemLabel?.(item) || String(item),
              error: errorMessage,
            });
          }
        }),
      );
    }

    // Final toast
    if (result.failed === 0) {
      toast.success(`${operationName}完成: ${result.completed} 个项目`, {
        id: toastId,
      });
    } else {
      toast.error(
        `${operationName}完成: ${result.completed} 成功, ${result.failed} 失败`,
        { id: toastId },
      );
    }
  } catch (error) {
    toast.error(`${operationName}失败: ${error instanceof Error ? error.message : 'Unknown error'}`, {
      id: toastId,
    });
    result.success = false;
  }

  return result;
}

/**
 * 显示操作成功提示
 */
export function showSuccessToast(message: string) {
  toast.success(message);
}

/**
 * 显示操作失败提示
 */
export function showErrorToast(message: string) {
  toast.error(message);
}

/**
 * 显示加载提示
 */
export function showLoadingToast(message: string) {
  return toast.loading(message);
}

/**
 * 更新加载提示
 */
export function updateToast(
  toastId: string | number,
  type: 'success' | 'error' | 'loading',
  message: string,
) {
  if (type === 'success') {
    toast.success(message, { id: toastId });
  } else if (type === 'error') {
    toast.error(message, { id: toastId });
  } else {
    toast.loading(message, { id: toastId });
  }
}

/**
 * 显示警告提示
 */
export function showWarningToast(message: string) {
  toast.warning(message);
}

/**
 * 显示信息提示
 */
export function showInfoToast(message: string) {
  toast.info(message);
}
