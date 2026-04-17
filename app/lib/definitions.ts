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

// ============ 性能监控相关类型 ============
export interface WebVitalsMetric {
  id: string;
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  navigationType: 'navigate' | 'reload' | 'back-forward' | 'prerender';
}

export interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTime: number;
  dbQueryTime: number;
  cacheHitRate: number;
  timestamp: Date;
}

// ============ 缓存相关类型 ============
export interface CacheConfig {
  key: string;
  ttl: number; // 秒
  tags?: string[];
  revalidate?: boolean;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// ============ 图像优化相关类型 ============
export interface ImageOptimizationConfig {
  formats: ('avif' | 'webp' | 'jpeg')[];
  sizes: {
    thumbnail: { width: number; height: number };
    medium: { width: number; height: number };
    large: { width: number; height: number };
  };
  quality: {
    avif: number;
    webp: number;
    jpeg: number;
  };
}

export interface OptimizedImage {
  id: number;
  originalUrl: string;
  variants: {
    format: string;
    size: string;
    url: string;
    width: number;
    height: number;
    fileSize: number;
  }[];
  blurHash: string;
}

// ============ 虚拟滚动相关类型 ============
export interface VirtualScrollConfig {
  itemHeight: number;
  overscan: number;
  estimateSize?: (index: number) => number;
}

export interface VirtualItem {
  index: number;
  start: number;
  size: number;
  end: number;
}

// ============ 安全相关类型 ============
export interface CSRFToken {
  token: string;
  expiresAt: Date;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
}

export interface RateLimitInfo {
  remaining: number;
  resetAt: Date;
  limit: number;
}

// ============ 文件上传相关类型 ============
export interface ChunkUploadInit {
  uploadId: string;
  fileName: string;
  fileSize: number;
  fileHash: string;
  mimeType: string;
  chunkSize: number;
  totalChunks: number;
  targetPath: string;
}

export interface ChunkUploadProgress {
  uploadId: string;
  uploadedChunks: number;
  totalChunks: number;
  percentage: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
}

// ============ 测试相关类型 ============
export interface TestCoverage {
  lines: { total: number; covered: number; percentage: number };
  statements: { total: number; covered: number; percentage: number };
  functions: { total: number; covered: number; percentage: number };
  branches: { total: number; covered: number; percentage: number };
}

// ============ 监控告警相关类型 ============
export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  operator: '>' | '<' | '>=' | '<=' | '==';
  duration: number; // 秒
  channels: ('email' | 'slack' | 'webhook')[];
}

export interface AlertEvent {
  ruleId: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
}

// ============ 日志系统相关类型 ============
export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  userId?: number;
  requestId?: string;
  duration?: number;
}

// ============ 备份系统相关类型 ============
export interface BackupConfig {
  type: 'database' | 'media';
  schedule: string; // cron 表达式
  retention: number; // 天数
  destination: string;
}

export interface BackupRecord {
  id: string;
  type: 'database' | 'media';
  size: number;
  path: string;
  checksum: string;
  createdAt: Date;
  verified: boolean;
}

// ============ 健康检查相关类型 ============
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: { status: 'up' | 'down'; latency?: number };
    redis: { status: 'up' | 'down'; latency?: number };
    storage: { status: 'up' | 'down'; available?: boolean };
  };
  timestamp: Date;
}

// ============ Server Actions 统一返回类型 ============
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  nextCursor?: number | null;
};

// ============ 媒体文件相关类型 ============
export interface MediaFile {
  id: number;
  title: string | null;
  path: string;
  url: string;
  thumbUrl: string | null;
  blurHash: string | null;
  mediaType: 'image' | 'video' | 'audio';
  mimeType: string;
  size: number;
  isPublished: boolean;
  author: string | null;
  fileHash: string | null;
  userStorageId: number;
  sourceType: string | null;
  mtime: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============ 类型守卫函数 ============
export function isMediaFile(obj: unknown): obj is MediaFile {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    typeof (obj as MediaFile).id === 'number' &&
    'path' in obj &&
    typeof (obj as MediaFile).path === 'string' &&
    'mediaType' in obj &&
    typeof (obj as MediaFile).mediaType === 'string'
  );
}

export function isImageFile(file: MediaFile): boolean {
  return file.mediaType === 'image';
}

export function isVideoFile(file: MediaFile): boolean {
  return file.mediaType === 'video';
}

export function isAudioFile(file: MediaFile): boolean {
  return file.mediaType === 'audio';
}
