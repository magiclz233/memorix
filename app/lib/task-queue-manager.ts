import type { UploadFile, UploadTask } from '@/app/lib/definitions';
import { FileUploadQueue } from '@/app/lib/file-upload-queue';

type ManagedTask = {
  task: UploadTask;
  queue: FileUploadQueue;
};

type TaskQueueManagerOptions = {
  onTaskPatch?: (taskId: string, patch: Partial<UploadTask>) => void;
  onFilePatch?: (
    taskId: string,
    fileId: string,
    patch: Partial<UploadFile>,
  ) => void;
};

export class TaskQueueManager {
  private onTaskPatch?: (taskId: string, patch: Partial<UploadTask>) => void;
  private onFilePatch?: (
    taskId: string,
    fileId: string,
    patch: Partial<UploadFile>,
  ) => void;

  private tasks = new Map<string, ManagedTask>();
  private pendingOrder: string[] = [];
  private activeTaskId: string | null = null;

  constructor(options?: TaskQueueManagerOptions) {
    this.onTaskPatch = options?.onTaskPatch;
    this.onFilePatch = options?.onFilePatch;
  }

  syncTasks(tasks: UploadTask[]) {
    const taskIdSet = new Set(tasks.map((task) => task.id));

    for (const task of tasks) {
      const managed = this.tasks.get(task.id);
      if (!managed) {
        this.registerTask(task);
        continue;
      }

      managed.task = task;
      managed.queue.setConcurrency(task.config.concurrency);
    }

    for (const id of Array.from(this.tasks.keys())) {
      if (!taskIdSet.has(id)) {
        this.tasks.delete(id);
        this.pendingOrder = this.pendingOrder.filter((taskId) => taskId !== id);
      }
    }
  }

  registerTask(task: UploadTask) {
    const queue = new FileUploadQueue({
      storageId: task.storageId,
      storageType: task.storageType,
      maxConcurrent: task.config.concurrency,
      onFilePatch: (fileId, patch) => {
        const managed = this.tasks.get(task.id);
        if (managed) {
          managed.task = {
            ...managed.task,
            files: managed.task.files.map((file) =>
              file.id === fileId ? { ...file, ...patch } : file,
            ),
          };
        }

        this.onFilePatch?.(task.id, fileId, patch);
      },
    });

    this.tasks.set(task.id, {
      task,
      queue,
    });

    if (task.status === 'queued') {
      this.enqueue(task.id);
    }
  }

  enqueue(taskId: string) {
    if (!this.pendingOrder.includes(taskId)) {
      this.pendingOrder.push(taskId);
    }

    const managed = this.tasks.get(taskId);
    if (managed) {
      managed.task = {
        ...managed.task,
        status: 'queued',
      };
      this.onTaskPatch?.(taskId, { status: 'queued' });
    }

    void this.processQueue();
  }

  pauseTask(taskId: string) {
    const managed = this.tasks.get(taskId);
    if (!managed) {
      return;
    }

    managed.queue.pauseAll();
    managed.task = {
      ...managed.task,
      status: 'paused',
    };

    if (this.activeTaskId === taskId) {
      this.activeTaskId = null;
    }

    this.pendingOrder = this.pendingOrder.filter((id) => id !== taskId);
    this.onTaskPatch?.(taskId, { status: 'paused' });

    void this.processQueue();
  }

  resumeTask(taskId: string) {
    const managed = this.tasks.get(taskId);
    if (!managed) {
      return;
    }

    managed.task = {
      ...managed.task,
      status: 'queued',
    };

    this.onTaskPatch?.(taskId, { status: 'queued' });
    this.enqueue(taskId);
  }

  cancelTask(taskId: string) {
    const managed = this.tasks.get(taskId);
    if (!managed) {
      return;
    }

    managed.queue.cancelAll();

    this.pendingOrder = this.pendingOrder.filter((id) => id !== taskId);

    if (this.activeTaskId === taskId) {
      this.activeTaskId = null;
    }

    managed.task = {
      ...managed.task,
      status: 'failed',
      completedAt: new Date().toISOString(),
    };

    this.onTaskPatch?.(taskId, {
      status: 'failed',
      completedAt: new Date().toISOString(),
    });

    void this.processQueue();
  }

  retryTask(taskId: string) {
    const managed = this.tasks.get(taskId);
    if (!managed) {
      return;
    }

    for (const file of managed.task.files) {
      if (file.status === 'error' || file.status === 'paused') {
        const patch: Partial<UploadFile> = {
          status: 'waiting',
          error: null,
          progress: 0,
          uploadedSize: 0,
          speed: 0,
          endTime: null,
          phase: 'hashing',
        };

        this.onFilePatch?.(taskId, file.id, patch);
      }
    }

    this.onTaskPatch?.(taskId, {
      status: 'queued',
      completedAt: null,
    });

    this.enqueue(taskId);
  }

  pauseFile(taskId: string, fileId: string) {
    const managed = this.tasks.get(taskId);
    if (!managed) {
      return;
    }

    managed.queue.pauseFile(fileId);
    this.onFilePatch?.(taskId, fileId, { status: 'paused' });
  }

  resumeFile(taskId: string, file: UploadFile) {
    const managed = this.tasks.get(taskId);
    if (!managed) {
      return;
    }

    managed.queue.resumeFile(file);
    this.onFilePatch?.(taskId, file.id, {
      status: 'waiting',
      error: null,
      endTime: null,
    });
    this.enqueue(taskId);
  }

  cancelFile(taskId: string, fileId: string) {
    const managed = this.tasks.get(taskId);
    if (!managed) {
      return;
    }

    managed.queue.cancelFile(fileId);
    this.onFilePatch?.(taskId, fileId, {
      status: 'error',
      error: 'Cancelled',
      endTime: Date.now(),
    });
  }

  removeTask(taskId: string) {
    this.cancelTask(taskId);
    this.tasks.delete(taskId);
    this.pendingOrder = this.pendingOrder.filter((id) => id !== taskId);
  }

  pauseAll() {
    for (const taskId of this.tasks.keys()) {
      this.pauseTask(taskId);
    }
  }

  resumeAll() {
    for (const taskId of this.tasks.keys()) {
      const managed = this.tasks.get(taskId);
      if (!managed) {
        continue;
      }

      if (managed.task.status === 'paused' || managed.task.status === 'queued') {
        this.resumeTask(taskId);
      }
    }
  }

  private async processQueue() {
    if (this.activeTaskId) {
      return;
    }

    const nextTaskId = this.pendingOrder.shift();
    if (!nextTaskId) {
      return;
    }

    const managed = this.tasks.get(nextTaskId);
    if (!managed) {
      void this.processQueue();
      return;
    }

    const task = managed.task;
    const candidates = task.files.filter(
      (file) => file.status === 'waiting' || file.status === 'paused' || file.status === 'error',
    );

    if (candidates.length === 0) {
      this.onTaskPatch?.(task.id, {
        status: 'completed',
        completedAt: task.completedAt ?? new Date().toISOString(),
      });
      void this.processQueue();
      return;
    }

    this.activeTaskId = nextTaskId;
    this.onTaskPatch?.(task.id, {
      status: 'uploading',
      startedAt: task.startedAt ?? new Date().toISOString(),
      completedAt: null,
    });

    const result = await managed.queue.start(candidates);
    this.activeTaskId = null;

    if (result === 'paused') {
      this.onTaskPatch?.(task.id, {
        status: 'paused',
      });
      return;
    }

    if (result === 'cancelled') {
      this.onTaskPatch?.(task.id, {
        status: 'failed',
        completedAt: new Date().toISOString(),
      });
      void this.processQueue();
      return;
    }

    const latestTask = this.tasks.get(task.id)?.task;
    const hasError = latestTask?.files.some((file) => file.status === 'error') ?? false;
    const hasUnfinished =
      latestTask?.files.some(
        (file) => file.status === 'waiting' || file.status === 'uploading' || file.status === 'paused',
      ) ?? false;

    if (hasError && !hasUnfinished) {
      this.onTaskPatch?.(task.id, {
        status: 'failed',
        completedAt: new Date().toISOString(),
      });
    } else if (!hasUnfinished) {
      this.onTaskPatch?.(task.id, {
        status: 'completed',
        completedAt: new Date().toISOString(),
      });
    }

    void this.processQueue();
  }
}