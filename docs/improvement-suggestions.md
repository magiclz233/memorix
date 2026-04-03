# Memorix 项目改进建议

本文档整理了项目的架构、性能、用户体验、安全性、代码质量等方面的改进建议。

---

## 1. 添加 Redis 可选支持

**优先级：高**

### 问题描述
项目缺少缓存和速率限制机制，需要添加 Redis 支持，但要保证在没有 Redis 的环境下也能正常运行。

### 使用场景
- **缓存**：热点数据（首页、作品集、存储配置）
- **速率限制**：防止 API 被滥用
- **任务队列**：批量操作、元数据提取（可选）

### 实现方案

#### 1. 安装依赖
```bash
npm install ioredis
```

#### 2. 创建可选 Redis 客户端
```typescript
// app/lib/redis.ts
import Redis from 'ioredis';

let redisClient: Redis | null = null;

// 初始化 Redis（如果配置了）
if (process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 200, 1000);
      },
    });

    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis connected');
    });
  } catch (error) {
    console.warn('Redis initialization failed, falling back to no cache:', error);
    redisClient = null;
  }
}

export { redisClient };

// 缓存工具函数
export async function getCached<T>(
  key: string,
  fallback: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  if (!redisClient) {
    return fallback();
  }

  try {
    const cached = await redisClient.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    const data = await fallback();
    await redisClient.setex(key, ttl, JSON.stringify(data));
    return data;
  } catch (error) {
    console.warn('Redis cache error, using fallback:', error);
    return fallback();
  }
}

// 删除缓存
export async function deleteCached(pattern: string): Promise<void> {
  if (!redisClient) return;

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (error) {
    console.warn('Redis delete error:', error);
  }
}
```

#### 3. 使用缓存示例
```typescript
// app/lib/data.ts
import { getCached, deleteCached } from './redis';

export async function fetchHeroPhotosForHome() {
  return getCached(
    'hero-photos',
    async () => {
      // 原有的数据库查询逻辑
      return db.query.files.findMany({
        where: eq(files.isPublished, true),
        limit: 10,
      });
    },
    300 // 5分钟缓存
  );
}

// 更新数据后清除缓存
export async function setFilesPublished(fileIds: number[]) {
  // ... 更新数据库
  await deleteCached('hero-photos');
  await deleteCached('gallery:*');
}
```

#### 4. 速率限制中间件
```typescript
// app/lib/rate-limit.ts
import { redisClient } from './redis';

const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowSeconds: number = 60
): Promise<{ success: boolean; remaining: number }> {
  const key = `rate-limit:${identifier}`;

  if (redisClient) {
    // 使用 Redis
    try {
      const current = await redisClient.incr(key);
      if (current === 1) {
        await redisClient.expire(key, windowSeconds);
      }

      const remaining = Math.max(0, limit - current);
      return {
        success: current <= limit,
        remaining,
      };
    } catch (error) {
      console.warn('Redis rate limit error, allowing request:', error);
      return { success: true, remaining: limit };
    }
  } else {
    // 降级到内存存储
    const now = Date.now();
    const record = inMemoryStore.get(key);

    if (!record || now > record.resetAt) {
      inMemoryStore.set(key, {
        count: 1,
        resetAt: now + windowSeconds * 1000,
      });
      return { success: true, remaining: limit - 1 };
    }

    record.count++;
    const remaining = Math.max(0, limit - record.count);
    return {
      success: record.count <= limit,
      remaining,
    };
  }
}

// 清理内存存储（定时任务）
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of inMemoryStore.entries()) {
    if (now > record.resetAt) {
      inMemoryStore.delete(key);
    }
  }
}, 60000); // 每分钟清理一次
```

#### 5. 在 API 中使用速率限制
```typescript
// app/api/upload/route.ts
import { checkRateLimit } from '@/app/lib/rate-limit';

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 速率限制：每个用户每分钟最多 10 次上传
  const { success, remaining } = await checkRateLimit(
    `upload:${session.user.id}`,
    10,
    60
  );

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests, please try again later' },
      {
        status: 429,
        headers: { 'X-RateLimit-Remaining': remaining.toString() }
      }
    );
  }

  // 原有的上传逻辑
  // ...
}
```

#### 6. 环境变量配置
```bash
# .env.local
# 可选：如果配置了则使用 Redis，否则降级到内存/数据库
REDIS_URL=redis://localhost:6379

# 或者使用 Redis Cloud / Upstash
# REDIS_URL=rediss://default:password@your-redis.upstash.io:6379
```

### 优势
- **可选配置**：没有 Redis 也能正常运行
- **自动降级**：Redis 连接失败时自动使用内存存储
- **零侵入**：不影响现有代码逻辑
- **易于扩展**：后续可以添加任务队列等功能

---

## 2. 路径注入安全漏洞

**优先级：高**

### 问题描述
`app/lib/storage.ts` 中的 `scanMediaFiles` 函数直接使用用户提供的路径，没有验证是否在允许的根目录内。

### 风险代码
```typescript
export async function scanMediaFiles(rootPath: string) {
  const results: MediaFileInfo[] = [];
  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    // 直接遍历，没有检查 dir 是否在 rootPath 内
  }
}
```

### 攻击场景
恶意用户可能通过 `../` 遍历到系统敏感目录。

### 建议方案
添加路径验证：

```typescript
import path from 'path';

export async function scanMediaFiles(rootPath: string) {
  const normalizedRoot = path.resolve(rootPath);

  async function walk(dir: string) {
    const normalizedDir = path.resolve(dir);

    // 确保当前目录在根目录内
    if (!normalizedDir.startsWith(normalizedRoot)) {
      throw new Error('Path traversal detected');
    }

    const entries = await fs.readdir(dir, { withFileTypes: true });
    // ...
  }
}
```

---

## 3. 存储扫描性能问题

**优先级：高**

### 问题描述
`app/lib/storage-scan.ts` 中的 `runStorageScan` 和 `runS3StorageScan` 将所有操作放在单个事务中，扫描大型存储时会导致长时间锁表。

### 影响
- 扫描 10,000+ 文件时，事务可能持续数分钟
- 阻塞其他数据库操作
- 事务失败时需要重新扫描所有文件

### 建议方案
分批处理，每批独立事务：

```typescript
export async function runStorageScan(storageId: number, mode: 'incremental' | 'full') {
  const BATCH_SIZE = 100;
  const scannedFiles = await scanMediaFiles(rootPath);

  // 分批处理
  for (let i = 0; i < scannedFiles.length; i += BATCH_SIZE) {
    const batch = scannedFiles.slice(i, i + BATCH_SIZE);

    await db.transaction(async (tx) => {
      for (const file of batch) {
        // 处理单个文件
        await processFile(tx, file);
      }
    });
  }
}
```

---

## 4. 上传接口优化（分片上传 + 断点续传）

**优先级：高**

### 问题描述
当前上传接口串行处理文件，不支持大文件、断点续传、进度显示等功能。

### 功能特性
- ✅ 分片上传（支持 GB 级大文件）
- ✅ 断点续传（刷新页面可继续）
- ✅ 秒传检测（文件哈希）
- ✅ 并发控制（多文件并行）
- ✅ 实时进度显示
- ✅ 自动重试

### 数据库表设计

```typescript
// app/lib/schema.ts 添加以下表

// 上传任务表
export const uploadTasks = pgTable('upload_tasks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  storageId: integer('storage_id').notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  fileHash: varchar('file_hash', { length: 64 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }),
  chunkSize: integer('chunk_size').notNull().default(5242880), // 5MB
  totalChunks: integer('total_chunks').notNull(),
  uploadedChunks: integer('uploaded_chunks').notNull().default(0),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  fileId: integer('file_id'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  userStatusIndex: index('upload_tasks_user_status_idx').on(table.userId, table.status),
  hashIndex: index('upload_tasks_hash_idx').on(table.fileHash),
}));

// 分片记录表
export const uploadChunks = pgTable('upload_chunks', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  chunkHash: varchar('chunk_hash', { length: 64 }),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
}, (table) => ({
  taskChunkUnique: uniqueIndex('upload_chunks_task_chunk_unique').on(table.taskId, table.chunkIndex),
  taskIndex: index('upload_chunks_task_idx').on(table.taskId),
}));

// files 表添加 fileHash 字段用于秒传
export const files = pgTable('files', {
  // ... 现有字段
  fileHash: varchar('file_hash', { length: 64 }),
  // ...
});
```

### API 路由

```
POST   /api/upload/init          # 初始化上传任务
POST   /api/upload/chunk         # 上传分片
POST   /api/upload/complete      # 完成上传
GET    /api/upload/status/:id    # 查询上传状态
DELETE /api/upload/cancel/:id    # 取消上传
```

### 实现步骤

1. **安装依赖**
```bash
npm install spark-md5 @types/spark-md5
```

2. **创建数据库迁移**
```bash
# 创建迁移文件
drizzle-kit generate:pg
drizzle-kit push:pg
```

3. **实现 API 路由**
   - `/api/upload/init/route.ts` - 初始化任务，支持秒传检测和断点续传
   - `/api/upload/chunk/route.ts` - 上传分片，验证哈希，保存到临时目录
   - `/api/upload/complete/route.ts` - 合并分片，创建文件记录，清理临时文件

4. **前端上传组件**
   - `app/ui/admin/media/chunked-uploader.tsx` - 分片上传组件
   - 计算文件哈希（SparkMD5）
   - 并发上传控制（3个分片同时上传）
   - 实时进度显示

### 核心逻辑

**初始化上传**
```typescript
// 1. 计算文件哈希
const fileHash = await calculateFileHash(file);

// 2. 秒传检测
const existingFile = await db.query.files.findFirst({
  where: and(
    eq(files.userStorageId, storageId),
    eq(files.fileHash, fileHash)
  ),
});

if (existingFile) {
  return { instantUpload: true, fileId: existingFile.id };
}

// 3. 检查未完成任务（断点续传）
const existingTask = await db.query.uploadTasks.findFirst({
  where: and(
    eq(uploadTasks.fileHash, fileHash),
    eq(uploadTasks.status, 'pending')
  ),
});

if (existingTask) {
  return { taskId: existingTask.id, uploadedChunks: existingTask.uploadedChunks };
}
```

**上传分片**
```typescript
// 1. 验证分片哈希
const buffer = Buffer.from(await chunk.arrayBuffer());
const hash = crypto.createHash('md5').update(buffer).digest('hex');

// 2. 保存到临时目录
const tempDir = path.join(process.cwd(), '.temp', 'uploads', taskId.toString());
await fs.writeFile(path.join(tempDir, `chunk_${chunkIndex}`), buffer);

// 3. 记录分片
await db.insert(uploadChunks).values({ taskId, chunkIndex, chunkHash });
```

**完成上传**
```typescript
// 1. 验证所有分片已上传
const chunks = await db.query.uploadChunks.findMany({ where: eq(uploadChunks.taskId, taskId) });
if (chunks.length !== task.totalChunks) {
  return { error: 'Missing chunks' };
}

// 2. 合并分片
const writeStream = await fs.open(finalPath, 'w');
for (let i = 0; i < task.totalChunks; i++) {
  const chunkData = await fs.readFile(path.join(tempDir, `chunk_${i}`));
  await writeStream.write(chunkData);
}
await writeStream.close();

// 3. 创建文件记录
await db.insert(files).values({ ..., fileHash: task.fileHash });

// 4. 清理临时文件
await fs.rm(tempDir, { recursive: true });
```

### 优势
- 支持超大文件（GB 级别）
- 断点续传，网络中断可恢复
- 秒传检测，节省带宽和时间
- 并发上传，充分利用带宽
- 分片验证，确保数据完整性

---

## 5. 存储抽象层缺失

**优先级：中**

### 问题描述
Local、NAS、S3 的文件操作逻辑分散在多个文件中，代码重复且难以维护。

### 建议方案
创建统一的存储接口：

```typescript
// app/lib/storage-adapter.ts
interface StorageAdapter {
  read(path: string): Promise<Buffer>;
  write(path: string, data: Buffer): Promise<void>;
  delete(path: string): Promise<void>;
  list(prefix: string): AsyncIterable<string>;
  exists(path: string): Promise<boolean>;
}

class LocalStorageAdapter implements StorageAdapter {
  constructor(private rootPath: string) {}

  async read(path: string): Promise<Buffer> {
    return fs.readFile(this.resolvePath(path));
  }

  private resolvePath(path: string): string {
    const resolved = path.resolve(this.rootPath, path);
    if (!resolved.startsWith(this.rootPath)) {
      throw new Error('Path traversal detected');
    }
    return resolved;
  }
}

class S3StorageAdapter implements StorageAdapter {
  // S3 实现
}

// 工厂函数
export function createStorageAdapter(config: StorageConfig): StorageAdapter {
  switch (config.type) {
    case 'local':
    case 'nas':
      return new LocalStorageAdapter(config.rootPath);
    case 's3':
    case 'qiniu':
      return new S3StorageAdapter(config);
  }
}
```

---

## 6. 数据查询性能问题

**优先级：中**

### 问题描述
`app/lib/data.ts` 中的 `fetchMediaLibraryPage` 使用 LEFT JOIN 和复杂过滤，但缺少必要的索引。

### 缺失的索引
```sql
-- 按相机型号过滤
CREATE INDEX photo_metadata_camera_idx ON photo_metadata(camera);

-- 按制造商过滤
CREATE INDEX photo_metadata_maker_idx ON photo_metadata(maker);

-- 按镜头过滤
CREATE INDEX photo_metadata_lens_idx ON photo_metadata(lens);

-- GPS 查询
CREATE INDEX photo_metadata_gps_idx ON photo_metadata(gps_latitude, gps_longitude)
WHERE gps_latitude IS NOT NULL AND gps_longitude IS NOT NULL;

-- 视频分辨率过滤
CREATE INDEX video_metadata_resolution_idx ON video_metadata(width, height);
```

### 查询优化
当前使用 OFFSET 分页，大偏移量时性能差：

```typescript
// 当前实现
.limit(pageSize)
.offset((page - 1) * pageSize);

// 建议改为游标分页
.where(lt(files.id, cursor))
.limit(pageSize);
```

---

## 7. 批量操作用户体验差

**优先级：中**

### 问题描述
批量删除、批量下载等操作没有进度提示，用户不知道操作是否在进行。

### 建议方案
使用 React Query 或 SWR 配合 toast 提示：

```typescript
// app/ui/admin/media/media-library.tsx
const handleBatchDelete = async () => {
  const toastId = toast.loading(`正在删除 ${selectedIds.size} 个文件...`);

  try {
    const result = await deleteMediaFiles(Array.from(selectedIds));

    if (result.success) {
      toast.success(`成功删除 ${result.deletedCount} 个文件`, { id: toastId });
    } else {
      toast.error(`删除失败: ${result.error}`, { id: toastId });
    }
  } catch (error) {
    toast.error('删除过程中发生错误', { id: toastId });
  }
};
```

对于大批量操作，考虑后台任务队列：

```typescript
// 使用 BullMQ 或类似队列
import { Queue } from 'bullmq';

const deleteQueue = new Queue('media-delete', {
  connection: redisConnection,
});

// 添加任务
await deleteQueue.add('batch-delete', {
  fileIds: Array.from(selectedIds),
  userId: session.user.id,
});

// 前端轮询任务状态
const checkJobStatus = async (jobId: string) => {
  const response = await fetch(`/api/jobs/${jobId}`);
  return response.json();
};
```

---

## 8. 错误处理不统一

**优先级：中**

### 问题描述
Server Actions 和 API Routes 的错误处理方式不一致，有些返回错误对象，有些抛出异常。

### 当前问题
```typescript
// actions.ts - 返回错误对象
export async function saveUserStorage(data: FormData) {
  try {
    // ...
  } catch (error) {
    return { success: false, error: 'Failed to save' };
  }
}

// upload/route.ts - 返回 NextResponse
export async function POST(request: NextRequest) {
  try {
    // ...
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 建议方案
统一错误处理：

```typescript
// app/lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

// 统一的错误处理函数
export function handleError(error: unknown) {
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
    };
  }

  console.error('Unexpected error:', error);
  return {
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  };
}
```

---

## 9. 元数据提取可靠性问题

**优先级：中**

### 问题描述
`extractMetadataAsync` 在后台异步执行，失败时没有重试机制，导致部分文件永久缺失元数据。

### 建议方案
1. 添加重试逻辑
2. 记录失败的文件
3. 提供手动重新提取的接口

```typescript
// app/lib/metadata-extractor.ts
import pRetry from 'p-retry';

export async function extractMetadataAsync(
  fileId: number,
  absolutePath: string,
  mediaType: string,
  storageId: number
) {
  try {
    await pRetry(
      async () => {
        if (mediaType === 'image') {
          await extractImageMetadata(fileId, absolutePath);
        } else if (mediaType === 'video') {
          await extractVideoMetadata(fileId, absolutePath);
        }
      },
      {
        retries: 3,
        onFailedAttempt: (error) => {
          console.warn(
            `Metadata extraction attempt ${error.attemptNumber} failed for file ${fileId}:`,
            error.message
          );
        },
      }
    );
  } catch (error) {
    // 记录失败
    await db.insert(metadataExtractionFailures).values({
      fileId,
      error: error instanceof Error ? error.message : 'Unknown error',
      attemptCount: 3,
      lastAttemptAt: new Date(),
    });
  }
}

// 添加重新提取接口
export async function retryFailedExtractions() {
  const failures = await db.query.metadataExtractionFailures.findMany({
    where: lt(metadataExtractionFailures.attemptCount, 5),
  });

  for (const failure of failures) {
    // 重新尝试提取
  }
}
```

---

## 10. Live Photo 配对逻辑脆弱

**优先级：低**

### 问题描述
`storage-scan.ts` 中的 Live Photo 配对依赖文件名匹配，容易出错。

### 当前逻辑
```typescript
const baseName = path.basename(imgPath, imgExt);
const videoPath = path.join(path.dirname(imgPath), `${baseName}.MOV`);
```

### 问题
- 大小写敏感（.mov vs .MOV）
- 文件名必须完全匹配
- 不支持其他命名模式

### 建议方案
```typescript
function findPairedVideo(imagePath: string): string | null {
  const dir = path.dirname(imagePath);
  const baseName = path.basename(imagePath, path.extname(imagePath));

  // 尝试多种可能的视频扩展名
  const videoExtensions = ['.MOV', '.mov', '.MP4', '.mp4'];

  for (const ext of videoExtensions) {
    const videoPath = path.join(dir, `${baseName}${ext}`);
    if (fs.existsSync(videoPath)) {
      return videoPath;
    }
  }

  // 尝试模糊匹配（处理 IMG_1234.HEIC 和 IMG_1234_HEVC.MOV 的情况）
  const files = fs.readdirSync(dir);
  const pattern = new RegExp(`^${escapeRegex(baseName)}[_-]?.*\\.(mov|mp4)$`, 'i');
  const match = files.find(f => pattern.test(f));

  return match ? path.join(dir, match) : null;
}
```

---

## 11. 国际化不完整

**优先级：低**

### 问题描述
部分错误消息和 UI 文本硬编码，没有使用 i18n。

### 示例
```typescript
// app/lib/actions.ts
throw new Error('Storage not found'); // 应该使用 t('errors.storageNotFound')

// app/ui/admin/media/media-library.tsx
<Button>Delete</Button> // 应该使用 t('actions.delete')
```

### 建议方案
1. 审查所有硬编码文本
2. 添加到 `messages/en.json` 和 `messages/zh-CN.json`
3. 使用 `useTranslations` hook

```typescript
// 正确示例
const t = useTranslations('admin.media');

<Button onClick={handleDelete}>
  {t('actions.delete')}
</Button>
```

---

## 12. 缺少监控和日志

**优先级：低**

### 问题描述
没有结构化日志和性能监控，难以排查生产环境问题。

### 建议方案
1. 使用结构化日志库（如 Pino）
2. 添加性能追踪
3. 集成错误监控（如 Sentry）

```typescript
// app/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

// 使用示例
logger.info({ userId, storageId }, 'Starting storage scan');
logger.error({ error, fileId }, 'Metadata extraction failed');

// 性能追踪
export function withTiming<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  return fn().finally(() => {
    const duration = Date.now() - start;
    logger.info({ name, duration }, 'Operation completed');
  });
}
```

---

## 13. 缺少插件系统

**优先级：低**

### 问题描述
元数据提取、存储适配等功能硬编码，难以扩展新的格式或存储类型。

### 建议方案
设计插件接口：

```typescript
// app/lib/plugins/types.ts
export interface MetadataExtractorPlugin {
  name: string;
  supportedMimeTypes: string[];
  extract(filePath: string): Promise<Record<string, unknown>>;
}

export interface StoragePlugin {
  name: string;
  type: string;
  createAdapter(config: unknown): StorageAdapter;
  validateConfig(config: unknown): boolean;
}

// app/lib/plugins/registry.ts
class PluginRegistry {
  private metadataExtractors = new Map<string, MetadataExtractorPlugin>();
  private storagePlugins = new Map<string, StoragePlugin>();

  registerMetadataExtractor(plugin: MetadataExtractorPlugin) {
    this.metadataExtractors.set(plugin.name, plugin);
  }

  getExtractorForMimeType(mimeType: string): MetadataExtractorPlugin | null {
    for (const plugin of this.metadataExtractors.values()) {
      if (plugin.supportedMimeTypes.includes(mimeType)) {
        return plugin;
      }
    }
    return null;
  }
}

export const pluginRegistry = new PluginRegistry();

// 使用示例
import { heicExtractorPlugin } from './plugins/heic-extractor';
pluginRegistry.registerMetadataExtractor(heicExtractorPlugin);
```

---

## 14. 代码重复问题

**优先级：低**

### 问题描述
多处出现相似的数据库查询和验证逻辑。

### 示例
```typescript
// actions.ts 中多次出现
const session = await auth.api.getSession({ headers: await headers() });
if (!session?.user) {
  return { success: false, error: 'Unauthorized' };
}

// 建议提取为工具函数
export async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new UnauthorizedError();
  }
  return session.user;
}

export async function requireAdminUser() {
  const user = await requireUser();
  if (user.role !== 'admin') {
    throw new ForbiddenError();
  }
  return user;
}
```

---

## 15. 测试覆盖率为零

**优先级：中**

### 问题描述
项目没有任何测试，重构和添加新功能时容易引入 bug。

### 建议方案
1. 添加单元测试（Vitest）
2. 添加集成测试（Playwright）
3. 添加 E2E 测试

```typescript
// __tests__/lib/storage.test.ts
import { describe, it, expect } from 'vitest';
import { scanMediaFiles } from '@/app/lib/storage';

describe('scanMediaFiles', () => {
  it('should scan directory and return media files', async () => {
    const files = await scanMediaFiles('/test/fixtures');
    expect(files).toHaveLength(3);
    expect(files[0]).toMatchObject({
      name: 'photo.jpg',
      mediaType: 'image',
    });
  });

  it('should reject path traversal attempts', async () => {
    await expect(
      scanMediaFiles('/test/../../../etc')
    ).rejects.toThrow('Path traversal detected');
  });
});

// __tests__/e2e/upload.spec.ts
import { test, expect } from '@playwright/test';

test('admin can upload images', async ({ page }) => {
  await page.goto('/admin/media');
  await page.click('text=Upload');
  await page.setInputFiles('input[type="file"]', 'fixtures/test.jpg');
  await page.click('text=Confirm');

  await expect(page.locator('text=Upload successful')).toBeVisible();
});
```

---

## 优先级总结

### 高优先级（立即处理）
1. **添加 Redis 可选支持**（缓存 + 速率限制）
2. **修复路径注入漏洞**
3. **优化存储扫描性能**
4. **上传接口优化**（分片上传 + 断点续传）

### 中优先级（近期处理）
5. 创建存储抽象层
6. 添加数据库索引
7. 改进批量操作 UX
8. 统一错误处理
9. 增强元数据提取可靠性
10. 添加测试

### 低优先级（长期优化）
11. 改进 Live Photo 配对
12. 完善国际化
13. 添加监控和日志
14. 设计插件系统
15. 重构重复代码

---

## 实施建议

1. **第一阶段（1-2周）**：处理所有高优先级问题，确保系统安全性和稳定性
2. **第二阶段（2-4周）**：处理中优先级问题，提升性能和用户体验
3. **第三阶段（持续）**：逐步处理低优先级问题，提升代码质量和可维护性

每个改进都应该：
- 创建独立的 Git 分支
- 编写测试验证修复
- 更新相关文档
- Code Review 后合并

---

*文档生成时间：2026-04-03*
