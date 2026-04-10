'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import type {
  TaskConfig,
  UploadFile,
  UploadStorageOption,
  UploadTask,
  UploadTaskCategory,
} from '@/app/lib/definitions';
import { clearTaskProgress, resumeUpload } from '@/app/lib/upload-resume';
import { deleteTask, getTasks, saveTasks } from '@/app/lib/task-storage';
import {
  calculateTaskMetadata,
  createTaskConfig,
  createUploadFile,
} from '@/app/lib/upload-task-utils';
import { TaskQueueManager } from '@/app/lib/task-queue-manager';
import { useThrottle } from '@/app/ui/hooks/use-throttle';

type Listener = (tasks: UploadTask[]) => void;

type CreateTaskInput = {
  name: string;
  storage: UploadStorageOption;
  category: UploadTaskCategory;
  files: File[];
  config?: Partial<TaskConfig>;
};

let taskStore: UploadTask[] = [];
let hydrated = false;
let hydratePromise: Promise<void> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<Listener>();

function recomputeTask(task: UploadTask, filePatch?: { old: UploadFile; next: UploadFile }): UploadTask {
  if (!filePatch) {
    return {
      ...task,
      metadata: calculateTaskMetadata(task.files),
    };
  }

  const { old, next } = filePatch;
  const metadata = { ...task.metadata };

  // 1. 统计完成和失败状态变更
  if (old.status !== next.status) {
    if (old.status === 'done') metadata.uploadedFiles--;
    if (next.status === 'done') metadata.uploadedFiles++;
    if (old.status === 'error') metadata.failedFiles--;
    if (next.status === 'error') metadata.failedFiles++;
  }

  // 2. 统计上传大小变更
  const oldUploadedSize = old.uploadedSize || 0;
  const nextUploadedSize = next.uploadedSize || 0;
  metadata.uploadedSize = metadata.uploadedSize - oldUploadedSize + nextUploadedSize;

  // 3. 更新进度百分比
  if (metadata.totalSize > 0) {
    metadata.progress = Math.min(100, Math.round((metadata.uploadedSize / metadata.totalSize) * 100));
  }

  // 4. 更新总体速度 (仅累加正在上传的文件速度)
  metadata.speed = metadata.speed - (old.speed || 0) + (next.speed || 0);

  // 5. 更新剩余时间
  const remainingBytes = Math.max(metadata.totalSize - metadata.uploadedSize, 0);
  metadata.remainingTime = metadata.speed > 0 ? Math.ceil(remainingBytes / metadata.speed) : null;

  return {
    ...task,
    metadata,
  };
}

function emit() {
  listeners.forEach((listener) => {
    listener(taskStore);
  });
}

function schedulePersist() {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }

  persistTimer = setTimeout(() => {
    void saveTasks(taskStore).catch((error) => {
      console.error('saveTasks failed', error);
    });
  }, 250);
}

function setTaskStore(nextTasks: UploadTask[]) {
  taskStore = nextTasks.map((task) => recomputeTask(task));
  manager.syncTasks(taskStore);
  schedulePersist();
  emit();
}

function patchTask(taskId: string, patch: Partial<UploadTask>) {
  const nextTasks = taskStore.map((task) =>
    task.id === taskId ? recomputeTask({ ...task, ...patch }) : task,
  );
  setTaskStore(nextTasks);
}

function patchFile(
  taskId: string,
  fileId: string,
  patch: Partial<UploadFile>,
) {
  const nextTasks = taskStore.map((task) => {
    if (task.id !== taskId) {
      return task;
    }

    let patchedFilePair: { old: UploadFile; next: UploadFile } | undefined;

    const nextFiles = task.files.map((file) => {
      if (file.id === fileId) {
        const nextFile = { ...file, ...patch };
        patchedFilePair = { old: file, next: nextFile };
        return nextFile;
      }
      return file;
    });

    return recomputeTask({ ...task, files: nextFiles }, patchedFilePair);
  });

  setTaskStore(nextTasks);
}

const manager = new TaskQueueManager({
  onTaskPatch: (taskId, patch) => {
    patchTask(taskId, patch);
  },
  onFilePatch: (taskId, fileId, patch) => {
    patchFile(taskId, fileId, patch);
  },
});

async function hydrateTaskStore() {
  if (hydrated) {
    return;
  }

  if (hydratePromise) {
    return hydratePromise;
  }

  hydratePromise = (async () => {
    const tasks = await getTasks();

    const resumedTasks = await Promise.all(
      tasks.map(async (task) => {
        const progressMap = await resumeUpload(task.id);
        const files = task.files.map((file) => {
          const progress = progressMap.get(file.id);
          if (!progress || file.status === 'done') {
            return file;
          }

          return {
            ...file,
            progress: Math.max(file.progress, progress.progress),
            uploadedSize: Math.max(file.uploadedSize, progress.uploadedSize),
            status:
              progress.status === 'done' || file.progress >= 100
                ? 'done'
                : progress.status === 'error'
                  ? 'error'
                  : 'waiting',
          } satisfies UploadFile;
        });

        return recomputeTask({
          ...task,
          files,
          status: task.status === 'uploading' ? 'queued' : task.status,
        });
      }),
    );

    taskStore = resumedTasks;
    manager.syncTasks(taskStore);
    taskStore.forEach((task) => {
      if (task.status === 'queued') {
        manager.enqueue(task.id);
      }
    });

    hydrated = true;
    emit();
  })();

  return hydratePromise;
}

export function useUploadTasks() {
  const [tasks, setTasks] = useState<UploadTask[]>(taskStore);
  const [ready, setReady] = useState(hydrated);

  useEffect(() => {
    let mounted = true;

    const listener: Listener = (nextTasks) => {
      if (!mounted) {
        return;
      }
      setTasks(nextTasks);
    };

    listeners.add(listener);
    listener(taskStore);

    void hydrateTaskStore().finally(() => {
      if (mounted) {
        setReady(true);
      }
    });

    return () => {
      mounted = false;
      listeners.delete(listener);
    };
  }, []);

  const throttledTasks = useThrottle(tasks, 100);

  const createTask = useCallback((input: CreateTaskInput) => {
    const taskId = uuidv4();
    const now = new Date().toISOString();

    const files = input.files.map((file) => createUploadFile(taskId, file));
    const task: UploadTask = {
      id: taskId,
      name: input.name,
      storageId: input.storage.id,
      storageType: input.storage.type,
      storageLabel: input.storage.label,
      category: input.category,
      status: 'queued',
      files,
      createdAt: now,
      startedAt: null,
      completedAt: null,
      config: createTaskConfig(input.config),
      metadata: calculateTaskMetadata(files),
    };

    setTaskStore([task, ...taskStore]);
    manager.enqueue(task.id);

    return task;
  }, []);

  const pauseTask = useCallback((taskId: string) => {
    manager.pauseTask(taskId);
  }, []);

  const resumeTask = useCallback((taskId: string) => {
    manager.resumeTask(taskId);
  }, []);

  const cancelTask = useCallback((taskId: string) => {
    manager.cancelTask(taskId);
  }, []);

  const retryTask = useCallback((taskId: string) => {
    manager.retryTask(taskId);
  }, []);

  const removeTask = useCallback((taskId: string) => {
    manager.removeTask(taskId);
    setTaskStore(taskStore.filter((task) => task.id !== taskId));
    void deleteTask(taskId);
    void clearTaskProgress(taskId);
  }, []);

  const clearCompleted = useCallback(() => {
    const completedIds = taskStore
      .filter((task) => task.status === 'completed')
      .map((task) => task.id);

    if (completedIds.length === 0) {
      return;
    }

    setTaskStore(taskStore.filter((task) => !completedIds.includes(task.id)));
    completedIds.forEach((taskId) => {
      void deleteTask(taskId);
      void clearTaskProgress(taskId);
    });
  }, []);

  const pauseFile = useCallback((taskId: string, fileId: string) => {
    manager.pauseFile(taskId, fileId);
  }, []);

  const resumeFile = useCallback((taskId: string, fileId: string) => {
    const task = taskStore.find((item) => item.id === taskId);
    const file = task?.files.find((item) => item.id === fileId);

    if (!task || !file) {
      return;
    }

    const resumableFile: UploadFile = {
      ...file,
      status: 'waiting',
      error: null,
      endTime: null,
    };

    patchFile(taskId, fileId, resumableFile);
    manager.resumeFile(taskId, resumableFile);
  }, []);

  const cancelFile = useCallback((taskId: string, fileId: string) => {
    manager.cancelFile(taskId, fileId);
  }, []);

  const retryFile = useCallback((taskId: string, fileId: string) => {
    const task = taskStore.find((item) => item.id === taskId);
    const file = task?.files.find((item) => item.id === fileId);

    if (!task || !file) {
      return;
    }

    const retryingFile: UploadFile = {
      ...file,
      status: 'waiting',
      error: null,
      progress: 0,
      uploadedSize: 0,
      speed: 0,
      endTime: null,
      phase: 'hashing',
    };

    patchFile(taskId, fileId, retryingFile);
    manager.resumeFile(taskId, retryingFile);
  }, []);

  const pauseAll = useCallback(() => {
    manager.pauseAll();
  }, []);

  const resumeAll = useCallback(() => {
    manager.resumeAll();
  }, []);

  const getTaskById = useCallback((taskId: string) => {
    return taskStore.find((task) => task.id === taskId) ?? null;
  }, []);

  const summary = useMemo(
    () => ({
      total: throttledTasks.length,
      uploading: throttledTasks.filter((task) => task.status === 'uploading').length,
      queued: throttledTasks.filter((task) => task.status === 'queued').length,
      completed: throttledTasks.filter((task) => task.status === 'completed').length,
      failed: throttledTasks.filter((task) => task.status === 'failed').length,
    }),
    [throttledTasks],
  );

  return {
    ready,
    tasks: throttledTasks,
    summary,
    createTask,
    pauseTask,
    resumeTask,
    cancelTask,
    retryTask,
    removeTask,
    clearCompleted,
    pauseFile,
    resumeFile,
    cancelFile,
    retryFile,
    pauseAll,
    resumeAll,
    getTaskById,
  };
}