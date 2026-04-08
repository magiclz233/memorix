import type { TaskConfig, TaskMetadata, UploadFile } from '@/app/lib/definitions';

const BYTES_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export const DEFAULT_TASK_CONFIG: TaskConfig = {
  concurrency: 3,
  duplicateHandling: 'skip',
  postProcessing: {
    autoTag: false,
    videoTranscode: false,
    imageCompress: false,
  },
};

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createTaskConfig(overrides?: Partial<TaskConfig>): TaskConfig {
  return {
    concurrency: overrides?.concurrency ?? DEFAULT_TASK_CONFIG.concurrency,
    duplicateHandling:
      overrides?.duplicateHandling ?? DEFAULT_TASK_CONFIG.duplicateHandling,
    postProcessing: {
      autoTag:
        overrides?.postProcessing?.autoTag ??
        DEFAULT_TASK_CONFIG.postProcessing.autoTag,
      videoTranscode:
        overrides?.postProcessing?.videoTranscode ??
        DEFAULT_TASK_CONFIG.postProcessing.videoTranscode,
      imageCompress:
        overrides?.postProcessing?.imageCompress ??
        DEFAULT_TASK_CONFIG.postProcessing.imageCompress,
    },
  };
}

export function createUploadFile(taskId: string, file: File): UploadFile {
  return {
    id: createId(),
    taskId,
    file,
    fileName: file.name,
    mimeType: file.type,
    status: 'waiting',
    progress: 0,
    speed: 0,
    error: null,
    uploadedSize: 0,
    totalSize: file.size,
    startTime: null,
    endTime: null,
    phase: 'hashing',
  };
}

export function calculateTaskMetadata(files: UploadFile[]): TaskMetadata {
  const totalFiles = files.length;
  const totalSize = files.reduce((sum, file) => sum + file.totalSize, 0);
  const uploadedFiles = files.filter((file) => file.status === 'done').length;
  const failedFiles = files.filter((file) => file.status === 'error').length;
  const speed = files
    .filter((file) => file.status === 'uploading')
    .reduce((sum, file) => sum + file.speed, 0);

  const uploadedSize = files.reduce((sum, file) => {
    if (file.status === 'done') {
      return sum + file.totalSize;
    }

    if (file.uploadedSize > 0) {
      return sum + Math.min(file.uploadedSize, file.totalSize);
    }

    return sum + Math.round((file.progress / 100) * file.totalSize);
  }, 0);

  const progress =
    totalSize > 0 ? Math.min(100, Math.round((uploadedSize / totalSize) * 100)) : 0;

  const remainingBytes = Math.max(totalSize - uploadedSize, 0);
  const remainingTime = speed > 0 ? Math.ceil(remainingBytes / speed) : null;

  return {
    totalFiles,
    totalSize,
    uploadedFiles,
    uploadedSize,
    failedFiles,
    progress,
    speed,
    remainingTime,
  };
}

export function formatBytes(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return '0 B';
  }

  if (value < 1024) {
    return `${Math.round(value)} B`;
  }

  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < BYTES_UNITS.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const fixed = size >= 10 ? 0 : 1;
  return `${size.toFixed(fixed)} ${BYTES_UNITS[unitIndex]}`;
}

export function formatSpeed(value: number) {
  return `${formatBytes(value)}/s`;
}

export function formatDuration(seconds: number | null) {
  if (!seconds || seconds < 0) {
    return '--';
  }

  const hour = Math.floor(seconds / 3600);
  const minute = Math.floor((seconds % 3600) / 60);
  const second = seconds % 60;

  if (hour > 0) {
    return `${hour}h ${minute}m`;
  }

  if (minute > 0) {
    return `${minute}m ${second}s`;
  }

  return `${second}s`;
}