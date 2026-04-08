// 前台展示用类型
export type MediaItem = {
  id: string;
  type: 'photo' | 'video';
  title: string;
  cover?: string;
  coverUrl?: string;
  tags?: string[];
  createdAt: string;
  collectionId?: string;
  liveType?: 'none' | 'embedded' | 'paired';
};

export type Collection = {
  id: string;
  type: 'photo' | 'video' | 'mixed';
  title: string;
  cover: string;
  covers?: string[];
  count: number;
  description: string;
  tags?: string[];
  author?: string;
};

export type UploadTaskCategory = 'photo' | 'video' | 'document';

export type TaskStatus = 'uploading' | 'queued' | 'completed' | 'paused' | 'failed';

export type FileStatus = 'uploading' | 'waiting' | 'done' | 'paused' | 'error';

export type UploadPhase = 'hashing' | 'uploading' | 'completing';

export type DuplicateHandling = 'skip' | 'rename' | 'overwrite';

export type TaskConfig = {
  concurrency: number;
  duplicateHandling: DuplicateHandling;
  postProcessing: {
    autoTag: boolean;
    videoTranscode: boolean;
    imageCompress: boolean;
  };
};

export type TaskMetadata = {
  totalFiles: number;
  totalSize: number;
  uploadedFiles: number;
  uploadedSize: number;
  failedFiles: number;
  progress: number;
  speed: number;
  remainingTime: number | null;
};

export type UploadFile = {
  id: string;
  taskId: string;
  file: File | null;
  fileName: string;
  mimeType: string;
  status: FileStatus;
  progress: number;
  speed: number;
  error: string | null;
  uploadedSize: number;
  totalSize: number;
  startTime: number | null;
  endTime: number | null;
  phase: UploadPhase;
};

export type UploadTask = {
  id: string;
  name: string;
  storageId: number;
  storageLabel: string;
  storageType: string;
  category: UploadTaskCategory;
  status: TaskStatus;
  files: UploadFile[];
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  config: TaskConfig;
  metadata: TaskMetadata;
};

export type UploadStorageOption = {
  id: number;
  type: string;
  label: string;
  description?: string;
};