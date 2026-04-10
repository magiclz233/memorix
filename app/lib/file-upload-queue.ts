import type { UploadFile } from '@/app/lib/definitions';
import { saveProgress } from '@/app/lib/upload-resume';
import { uploadWithRetry } from '@/app/lib/upload-retry';

type QueueResult = 'completed' | 'paused' | 'cancelled';

type FileUploadQueueOptions = {
  storageId: number;
  storageType: string;
  maxConcurrent?: number;
  onFilePatch?: (fileId: string, patch: Partial<UploadFile>) => void;
};

function createAbortError(message = 'Upload aborted') {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

async function responseError(response: Response) {
  const payload = await response.json().catch(() => ({}));
  return payload?.error || response.statusText || 'Request failed';
}

function isAbortError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: string }).name === 'AbortError'
  );
}

export class FileUploadQueue {
  private storageId: number;
  private storageType: string;
  private maxConcurrent: number;
  private onFilePatch?: (fileId: string, patch: Partial<UploadFile>) => void;

  private paused = false;
  private cancelled = false;
  private pending: UploadFile[] = [];
  private activeCount = 0;
  private controllers = new Map<string, AbortController>();
  private waiters: Array<(result: QueueResult) => void> = [];
  
  // Throttle progress updates to avoid excessive re-renders
  private lastProgressUpdate = new Map<string, number>();
  private readonly PROGRESS_THROTTLE_MS = 100;

  constructor(options: FileUploadQueueOptions) {
    this.storageId = options.storageId;
    this.storageType = options.storageType;
    this.maxConcurrent = Math.max(1, options.maxConcurrent ?? 3);
    this.onFilePatch = options.onFilePatch;
  }

  setConcurrency(value: number) {
    this.maxConcurrent = Math.max(1, value);
    this.processQueue();
  }

  async start(files: UploadFile[]) {
    this.paused = false;
    this.cancelled = false;

    const activeIds = new Set(this.pending.map((file) => file.id));
    for (const file of files) {
      if (activeIds.has(file.id)) {
        continue;
      }

      if (file.status === 'done') {
        continue;
      }

      this.pending.push(file);
      activeIds.add(file.id);
      this.patch(file.id, {
        status: 'waiting',
        error: null,
        phase: file.phase === 'completing' ? 'uploading' : file.phase,
      });
    }

    this.processQueue();

    if (this.pending.length === 0 && this.activeCount === 0) {
      return 'completed' as QueueResult;
    }

    return new Promise<QueueResult>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  pauseAll() {
    this.paused = true;

    for (const [fileId, controller] of this.controllers) {
      controller.abort();
      this.patch(fileId, { status: 'paused' });
    }

    for (const file of this.pending) {
      this.patch(file.id, { status: 'paused' });
    }

    this.pending = [];
    this.tryResolveWaiters('paused');
  }

  cancelAll() {
    this.cancelled = true;

    for (const [fileId, controller] of this.controllers) {
      controller.abort();
      this.patch(fileId, { status: 'error', error: 'Cancelled' });
    }

    for (const file of this.pending) {
      this.patch(file.id, { status: 'error', error: 'Cancelled' });
    }

    this.pending = [];
    this.tryResolveWaiters('cancelled');
  }

  pauseFile(fileId: string) {
    const activeController = this.controllers.get(fileId);
    if (activeController) {
      activeController.abort();
      this.patch(fileId, { status: 'paused' });
      return;
    }

    const next = this.pending.filter((file) => file.id !== fileId);
    if (next.length !== this.pending.length) {
      this.pending = next;
      this.patch(fileId, { status: 'paused' });
      this.tryResolveWaiters('completed');
    }
  }

  resumeFile(file: UploadFile) {
    if (file.status === 'done') {
      return;
    }

    this.patch(file.id, {
      status: 'waiting',
      error: null,
      endTime: null,
      phase: file.phase === 'completing' ? 'uploading' : file.phase,
    });

    if (!this.pending.some((item) => item.id === file.id)) {
      this.pending.push(file);
    }

    this.processQueue();
  }

  cancelFile(fileId: string) {
    const activeController = this.controllers.get(fileId);
    if (activeController) {
      activeController.abort();
    }

    this.pending = this.pending.filter((file) => file.id !== fileId);
    this.patch(fileId, { status: 'error', error: 'Cancelled' });
    this.tryResolveWaiters('completed');
  }

  private processQueue() {
    if (this.paused || this.cancelled) {
      return;
    }

    while (this.activeCount < this.maxConcurrent && this.pending.length > 0) {
      const file = this.pending.shift();
      if (!file || file.status === 'done') {
        continue;
      }

      this.activeCount += 1;
      this.uploadFile(file)
        .catch((error) => {
          if (!isAbortError(error) && !this.cancelled && !this.paused) {
            this.patch(file.id, {
              status: 'error',
              error: error instanceof Error ? error.message : 'Upload failed',
            });
          }
        })
        .finally(() => {
          this.activeCount = Math.max(0, this.activeCount - 1);
          this.controllers.delete(file.id);

          if (this.paused) {
            this.tryResolveWaiters('paused');
            return;
          }

          if (this.cancelled) {
            this.tryResolveWaiters('cancelled');
            return;
          }

          if (this.pending.length === 0 && this.activeCount === 0) {
            this.tryResolveWaiters('completed');
            return;
          }

          this.processQueue();
        });
    }
  }

  private async uploadFile(file: UploadFile) {
    await uploadWithRetry(
      async (attempt) => {
        if (this.paused || this.cancelled) {
          throw createAbortError();
        }

        this.patch(file.id, {
          status: 'uploading',
          startTime: file.startTime ?? Date.now(),
          error: null,
        });

        if (attempt > 1) {
          this.patch(file.id, {
            error: `Retrying (${attempt})`,
          });
        }

        if (this.storageType === 'local' || this.storageType === 'nas') {
          await this.uploadChunked(file);
        } else {
          await this.uploadDirect(file);
        }
      },
      {
        maxRetries: 3,
        baseDelay: 1000,
        onRetry: (attempt, maxRetries, error) => {
          this.patch(file.id, {
            status: 'uploading',
            error: `Retrying (${attempt}/${maxRetries})`,
          });
          void saveProgress(file.taskId, {
            ...file,
            status: 'uploading',
            error: error instanceof Error ? error.message : 'Retrying',
          });
        },
      },
    );
  }

  private async uploadDirect(file: UploadFile) {
    if (!file.file) {
      throw new Error('File data is missing');
    }

    const controller = new AbortController();
    this.controllers.set(file.id, controller);

    this.patch(file.id, {
      phase: 'uploading',
      progress: 20,
      uploadedSize: 0,
      speed: 0,
      status: 'uploading',
      error: null,
    });

    const formData = new FormData();
    formData.append('storageId', String(this.storageId));
    formData.append('files', file.file);

    const startedAt = Date.now();
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(await responseError(response));
    }

    const payload = await response.json();
    const result = payload?.results?.[0];
    if (result && !result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    const elapsed = Math.max(1, (Date.now() - startedAt) / 1000);
    const speed = file.totalSize / elapsed;

    this.patch(file.id, {
      phase: 'completing',
      progress: 100,
      uploadedSize: file.totalSize,
      speed,
      status: 'done',
      endTime: Date.now(),
      error: null,
    });

    await saveProgress(file.taskId, {
      ...file,
      phase: 'completing',
      progress: 100,
      uploadedSize: file.totalSize,
      speed,
      status: 'done',
      endTime: Date.now(),
      error: null,
    });
  }

  private async uploadChunked(file: UploadFile) {
    if (!file.file) {
      throw new Error('File data is missing');
    }

    this.patch(file.id, {
      phase: 'hashing',
      progress: 0,
      uploadedSize: 0,
      speed: 0,
      status: 'uploading',
      error: null,
    });

    const fileHash = await this.calculateFileHash(file.file, (progress) => {
      this.patch(file.id, {
        phase: 'hashing',
        progress: Math.max(1, Math.round(progress * 0.1)),
      });
    });

    if (this.paused || this.cancelled) {
      throw createAbortError();
    }

    const initController = new AbortController();
    this.controllers.set(file.id, initController);

    const initResponse = await fetch('/api/upload/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: initController.signal,
      body: JSON.stringify({
        fileName: file.file.name,
        fileSize: file.file.size,
        fileHash,
        mimeType: file.file.type || 'application/octet-stream',
        storageId: this.storageId,
        targetPath: '',
      }),
    });

    if (!initResponse.ok) {
      throw new Error(await responseError(initResponse));
    }

    const initData = await initResponse.json();

    if (initData.instantUpload) {
      this.patch(file.id, {
        phase: 'completing',
        progress: 100,
        uploadedSize: file.totalSize,
        speed: 0,
        status: 'done',
        endTime: Date.now(),
        error: null,
      });
      return;
    }

    const uploadId = String(initData.uploadId);
    const chunkSize = Math.max(1024 * 1024, Number(initData.chunkSize) || 5 * 1024 * 1024);
    const totalChunks = Math.max(1, Number(initData.totalChunks) || 1);
    const uploadedChunkIndexes = new Set<number>(initData.uploadedChunks ?? []);

    let uploadedBytes = Math.min(file.totalSize, uploadedChunkIndexes.size * chunkSize);
    const startAt = Date.now();

    this.patch(file.id, {
      phase: 'uploading',
      progress: 10,
      uploadedSize: uploadedBytes,
      status: 'uploading',
      error: null,
    });

    for (let index = 0; index < totalChunks; index += 1) {
      if (uploadedChunkIndexes.has(index)) {
        continue;
      }

      if (this.paused || this.cancelled) {
        throw createAbortError();
      }

      const start = index * chunkSize;
      const end = Math.min(start + chunkSize, file.file.size);
      const chunk = file.file.slice(start, end);
      const chunkHash = await this.digestChunk(chunk);

      const formData = new FormData();
      formData.append('uploadId', uploadId);
      formData.append('chunkIndex', String(index));
      formData.append('chunkHash', chunkHash);
      formData.append('chunk', chunk);

      const chunkController = new AbortController();
      this.controllers.set(file.id, chunkController);

      const chunkResponse = await fetch('/api/upload/chunk', {
        method: 'POST',
        body: formData,
        signal: chunkController.signal,
      });

      if (!chunkResponse.ok) {
        throw new Error(await responseError(chunkResponse));
      }

      uploadedBytes = Math.min(file.totalSize, uploadedBytes + chunk.size);
      const elapsed = Math.max(1, (Date.now() - startAt) / 1000);
      const speed = uploadedBytes / elapsed;
      const ratio = uploadedBytes / Math.max(1, file.totalSize);

      const patch: Partial<UploadFile> = {
        phase: 'uploading',
        progress: Math.min(95, Math.round(10 + ratio * 85)),
        uploadedSize: uploadedBytes,
        speed,
        status: 'uploading',
        error: null,
      };

      this.patch(file.id, patch);
      await saveProgress(file.taskId, {
        ...file,
        ...patch,
      });
    }

    this.patch(file.id, {
      phase: 'completing',
      progress: 96,
      status: 'uploading',
      error: null,
    });

    const completeController = new AbortController();
    this.controllers.set(file.id, completeController);

    const completeResponse = await fetch('/api/upload/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: completeController.signal,
      body: JSON.stringify({ uploadId }),
    });

    if (!completeResponse.ok) {
      throw new Error(await responseError(completeResponse));
    }

    const endTime = Date.now();
    const finalPatch: Partial<UploadFile> = {
      phase: 'completing',
      progress: 100,
      uploadedSize: file.totalSize,
      speed: 0,
      status: 'done',
      endTime,
      error: null,
    };

    this.patch(file.id, finalPatch);
    await saveProgress(file.taskId, {
      ...file,
      ...finalPatch,
      endTime,
    });
  }

  private async calculateFileHash(
    file: File,
    onProgress: (progress: number) => void,
  ): Promise<string> {
    if (typeof Worker !== 'undefined') {
      return new Promise<string>((resolve, reject) => {
        const worker = new Worker('/workers/hash-worker.js');

        worker.onmessage = (event: MessageEvent) => {
          const data = event.data;
          if (!data || typeof data !== 'object') {
            return;
          }

          if (data.type === 'progress') {
            onProgress(Number(data.progress) || 0);
            return;
          }

          if (data.type === 'done') {
            worker.terminate();
            resolve(String(data.hash));
            return;
          }

          if (data.type === 'error') {
            worker.terminate();
            reject(new Error(String(data.error || 'Hash calculation failed')));
          }
        };

        worker.onerror = () => {
          worker.terminate();
          reject(new Error('Hash worker crashed'));
        };

        worker.postMessage({ file, chunkSize: 2 * 1024 * 1024 });
      });
    }

    const buffer = await file.arrayBuffer();
    onProgress(100);
    return this.bufferToHex(await crypto.subtle.digest('SHA-256', buffer));
  }

  private async digestChunk(chunk: Blob) {
    const chunkBuffer = await chunk.arrayBuffer();
    return this.bufferToHex(await crypto.subtle.digest('SHA-256', chunkBuffer));
  }

  private bufferToHex(buffer: ArrayBuffer) {
    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  private patch(fileId: string, patch: Partial<UploadFile>) {
    // Throttle progress updates to avoid excessive re-renders
    // Only throttle if this is a progress-only update
    const isProgressUpdate = 
      'progress' in patch && 
      Object.keys(patch).length <= 3 && // progress, uploadedSize, speed
      !('status' in patch) && 
      !('error' in patch) &&
      !('phase' in patch);
    
    if (isProgressUpdate) {
      const now = Date.now();
      const lastUpdate = this.lastProgressUpdate.get(fileId) || 0;
      
      // Skip update if within throttle window, unless it's 100% complete
      if (now - lastUpdate < this.PROGRESS_THROTTLE_MS && patch.progress !== 100) {
        return;
      }
      
      this.lastProgressUpdate.set(fileId, now);
    }
    
    this.onFilePatch?.(fileId, patch);
  }

  private tryResolveWaiters(result: QueueResult) {
    if (this.activeCount > 0 && result === 'completed') {
      return;
    }

    if (this.waiters.length === 0) {
      return;
    }

    const waiters = [...this.waiters];
    this.waiters = [];
    waiters.forEach((resolve) => resolve(result));
  }
}