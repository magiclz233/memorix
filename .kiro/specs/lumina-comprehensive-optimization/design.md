# Lumina Pro 系统全面优化设计文档

## Overview

本设计文档针对 Lumina Pro 照片/视频管理系统进行全面的系统优化设计,涵盖前端性能、后端性能、代码架构、安全性、测试体系、国际化、监控日志和部署运维 8 个核心维度。

### 设计目标

1. **性能优化**: 实现 LCP < 2.5s、CLS < 0.1、FID < 100ms 的 Web Vitals 指标
2. **架构优化**: 建立清晰的代码结构、完整的类型系统和可复用的组件体系
3. **安全加固**: 实现 CSRF/XSS/SQL 注入防护、速率限制和文件上传安全
4. **测试体系**: 建立单元测试、集成测试、E2E 测试,达到 70% 覆盖率
5. **国际化**: 完善中英文双语支持,实现本地化格式和 SEO 优化
6. **监控日志**: 建立 Web Vitals 监控、错误追踪和结构化日志系统
7. **部署运维**: 实现 Docker 容器化、CI/CD 自动化和零停机部署

### 技术栈

- **前端**: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **UI 库**: Shadcn UI + Framer Motion
- **数据库**: Postgres + Drizzle ORM
- **缓存**: Redis (ioredis)
- **认证**: Better Auth
- **图像处理**: Sharp + BlurHash + Exifr
- **日志**: Pino
- **测试**: Vitest + Playwright
- **监控**: web-vitals + Sentry (可选)
- **部署**: Docker + GitHub Actions

## Architecture

### 系统架构图

```mermaid
graph TB
    subgraph "客户端层"
        Browser[浏览器]
        SW[Service Worker]
    end
    
    subgraph "前端应用层"
        NextJS[Next.js App Router]
        RSC[React Server Components]
        ClientComp[Client Components]
    end
    
    subgraph "缓存层"
        ISR[ISR Cache]
        Redis[Redis Cache]
        CDN[CDN/Edge Cache]
    end
    
    subgraph "后端服务层"
        ServerActions[Server Actions]
        API[API Routes]
        Auth[Better Auth]
    end
    
    subgraph "数据层"
        Postgres[(Postgres DB)]
        Storage[存储源<br/>Local/NAS/S3/七牛云]
    end
    
    subgraph "处理层"
        ImageProcessor[图像处理<br/>Sharp + BlurHash]
        VideoProcessor[视频处理<br/>FFmpeg]
        MetadataExtractor[元数据提取<br/>Exifr]
    end
    
    subgraph "监控层"
        WebVitals[Web Vitals 监控]
        ErrorTracker[错误追踪<br/>Sentry]
        Logger[日志系统<br/>Pino]
    end
    
    Browser --> SW
    SW --> NextJS
    Browser --> NextJS
    NextJS --> RSC
    NextJS --> ClientComp
    
    RSC --> ISR
    RSC --> ServerActions
    ClientComp --> API
    
    ServerActions --> Redis
    ServerActions --> Postgres
    ServerActions --> Storage
    API --> Redis
    API --> Postgres
    
    ServerActions --> Auth
    API --> Auth
    
    ServerActions --> ImageProcessor
    ServerActions --> VideoProcessor
    ServerActions --> MetadataExtractor
    
    ImageProcessor --> Storage
    VideoProcessor --> Storage
    MetadataExtractor --> Postgres
    
    NextJS --> WebVitals
    ServerActions --> ErrorTracker
    ServerActions --> Logger
    API --> Logger
```

### 数据流图

```mermaid
sequenceDiagram
    participant User as 用户
    participant Browser as 浏览器
    participant CDN as CDN/Edge
    participant Next as Next.js
    participant Redis as Redis
    participant DB as Postgres
    participant Storage as 存储源
    
    User->>Browser: 访问画廊页面
    Browser->>CDN: 请求静态资源
    CDN-->>Browser: 返回缓存资源
    
    Browser->>Next: 请求页面数据
    Next->>Redis: 查询缓存
    
    alt 缓存命中
        Redis-->>Next: 返回缓存数据
    else 缓存未命中
        Next->>DB: 查询数据库
        DB-->>Next: 返回数据
        Next->>Redis: 写入缓存
    end
    
    Next-->>Browser: 返回 HTML + 数据
    Browser->>Storage: 请求图片
    Storage-->>Browser: 返回优化后图片
    
    Browser->>Next: 上报 Web Vitals
    Next->>DB: 记录性能指标
```

### 部署架构图

```mermaid
graph TB
    subgraph "开发环境"
        Dev[开发者]
        Git[Git Repository]
    end
    
    subgraph "CI/CD Pipeline"
        GHA[GitHub Actions]
        Build[构建 Docker 镜像]
        Test[运行测试]
        Push[推送到 Registry]
    end
    
    subgraph "生产环境"
        LB[负载均衡器]
        App1[App Container 1]
        App2[App Container 2]
        PG[(Postgres)]
        RD[(Redis)]
        S3[对象存储]
    end
    
    subgraph "监控系统"
        Metrics[指标收集]
        Logs[日志聚合]
        Alerts[告警系统]
    end
    
    Dev -->|Push Code| Git
    Git -->|Trigger| GHA
    GHA --> Build
    Build --> Test
    Test --> Push
    Push -->|Deploy| LB
    
    LB --> App1
    LB --> App2
    App1 --> PG
    App1 --> RD
    App1 --> S3
    App2 --> PG
    App2 --> RD
    App2 --> S3
    
    App1 --> Metrics
    App1 --> Logs
    App2 --> Metrics
    App2 --> Logs
    Metrics --> Alerts
    Logs --> Alerts
```

## Components and Interfaces

### 前端组件架构

```typescript
// 组件层次结构
app/
├── ui/
│   ├── components/          // 通用组件
│   │   ├── error-boundary.tsx
│   │   ├── virtual-scroller.tsx
│   │   └── image-optimizer.tsx
│   ├── front/              // 前台组件
│   │   ├── gallery/
│   │   │   ├── gallery-grid.tsx
│   │   │   ├── gallery-item.tsx
│   │   │   └── gallery-filter.tsx
│   │   └── hero/
│   └── admin/              // 后台组件
│       ├── media/
│       └── upload/
└── lib/
    ├── actions/            // Server Actions
    ├── data/              // 数据查询
    └── utils/             // 工具函数
```

### 核心接口定义

```typescript
// app/lib/definitions.ts

// ============ 性能监控 ============
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

// ============ 缓存策略 ============
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

// ============ 图像优化 ============
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

// ============ 虚拟滚动 ============
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

// ============ 安全相关 ============
export interface CSRFToken {
  token: string;
  expiresAt: Date;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (req: Request) => string;
}

export interface RateLimitInfo {
  remaining: number;
  resetAt: Date;
  limit: number;
}

// ============ 文件上传 ============
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

// ============ 测试相关 ============
export interface TestCoverage {
  lines: { total: number; covered: number; percentage: number };
  statements: { total: number; covered: number; percentage: number };
  functions: { total: number; covered: number; percentage: number };
  branches: { total: number; covered: number; percentage: number };
}

// ============ 监控告警 ============
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

// ============ 日志系统 ============
export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  userId?: number;
  requestId?: string;
  duration?: number;
}

// ============ 备份系统 ============
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

// ============ 健康检查 ============
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: { status: 'up' | 'down'; latency?: number };
    redis: { status: 'up' | 'down'; latency?: number };
    storage: { status: 'up' | 'down'; available?: boolean };
  };
  timestamp: Date;
}
```

## Data Models

### 数据库索引优化

基于现有 schema.ts,添加以下复合索引以优化查询性能:

```typescript
// app/lib/schema.ts 索引优化

export const files = pgTable(
  'files',
  {
    // ... 现有字段
  },
  (table) => ({
    // 现有索引
    storagePathUnique: uniqueIndex('files_storage_path_unique').on(
      table.userStorageId,
      table.path,
    ),
    fileHashIndex: index('files_file_hash_idx').on(table.fileHash),
    publishedMtimeIndex: index('files_published_mtime_idx').on(
      table.isPublished,
      table.mtime,
    ),
    storagePublishedIndex: index('files_storage_published_idx').on(
      table.userStorageId,
      table.isPublished,
    ),
    
    // 新增索引
    // 1. 媒体类型 + 发布状态 + 修改时间 (画廊按类型筛选)
    mediaTypePublishedMtimeIndex: index('files_media_type_published_mtime_idx').on(
      table.mediaType,
      table.isPublished,
      table.mtime,
    ),
    
    // 2. 用户存储 + 媒体类型 (存储源下的媒体分类)
    storageMediaTypeIndex: index('files_storage_media_type_idx').on(
      table.userStorageId,
      table.mediaType,
    ),
    
    // 3. 创建时间索引 (按上传时间排序)
    createdAtIndex: index('files_created_at_idx').on(table.createdAt),
    
    // 4. 软删除 + 发布状态 (排除已删除文件)
    deletedPublishedIndex: index('files_deleted_published_idx').on(
      table.deletedAt,
      table.isPublished,
    ),
  }),
);
```

### Redis 缓存键设计

```typescript
// app/lib/cache-keys.ts

export const CacheKeys = {
  // 画廊列表: gallery:list:{mediaType}:{page}:{limit}
  galleryList: (mediaType: string, page: number, limit: number) =>
    `gallery:list:${mediaType}:${page}:${limit}`,
  
  // 作品集详情: collection:detail:{id}
  collectionDetail: (id: number) => `collection:detail:${id}`,
  
  // 作品集媒体: collection:media:{id}
  collectionMedia: (id: number) => `collection:media:${id}`,
  
  // 用户设置: user:settings:{userId}
  userSettings: (userId: number) => `user:settings:${userId}`,
  
  // 媒体详情: media:detail:{id}
  mediaDetail: (id: number) => `media:detail:${id}`,
  
  // 媒体元数据: media:metadata:{id}
  mediaMetadata: (id: number) => `media:metadata:${id}`,
  
  // 存储配置: storage:config:{id}
  storageConfig: (id: number) => `storage:config:${id}`,
  
  // 速率限制: ratelimit:{endpoint}:{identifier}
  rateLimit: (endpoint: string, identifier: string) =>
    `ratelimit:${endpoint}:${identifier}`,
  
  // 会话: session:{token}
  session: (token: string) => `session:${token}`,
  
  // CSRF Token: csrf:{userId}
  csrfToken: (userId: number) => `csrf:${userId}`,
  
  // 上传任务: upload:task:{uploadId}
  uploadTask: (uploadId: string) => `upload:task:${uploadId}`,
  
  // 文件秒传: upload:instant:{fileHash}
  instantUpload: (fileHash: string) => `upload:instant:${fileHash}`,
} as const;

export const CacheTTL = {
  galleryList: 60, // 1 分钟
  collectionDetail: 300, // 5 分钟
  collectionMedia: 300, // 5 分钟
  userSettings: 600, // 10 分钟
  mediaDetail: 300, // 5 分钟
  mediaMetadata: 600, // 10 分钟
  storageConfig: 3600, // 1 小时
  rateLimit: 60, // 1 分钟
  session: 86400, // 24 小时
  csrfToken: 3600, // 1 小时
  uploadTask: 86400, // 24 小时
  instantUpload: 604800, // 7 天
} as const;
```

### 新增数据表

```typescript
// 性能指标表
export const performanceMetrics = pgTable(
  'performance_metrics',
  {
    id: serial('id').primaryKey(),
    metricName: varchar('metric_name', { length: 50 }).notNull(),
    metricValue: doublePrecision('metric_value').notNull(),
    rating: varchar('rating', { length: 20 }),
    page: varchar('page', { length: 255 }),
    userId: integer('user_id'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    metricNameIndex: index('performance_metrics_metric_name_idx').on(table.metricName),
    createdAtIndex: index('performance_metrics_created_at_idx').on(table.createdAt),
  }),
);

// 错误日志表
export const errorLogs = pgTable(
  'error_logs',
  {
    id: serial('id').primaryKey(),
    level: varchar('level', { length: 20 }).notNull(),
    message: text('message').notNull(),
    stack: text('stack'),
    context: jsonb('context'),
    userId: integer('user_id'),
    requestId: varchar('request_id', { length: 64 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    levelIndex: index('error_logs_level_idx').on(table.level),
    createdAtIndex: index('error_logs_created_at_idx').on(table.createdAt),
    requestIdIndex: index('error_logs_request_id_idx').on(table.requestId),
  }),
);

// 审计日志表
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    action: varchar('action', { length: 100 }).notNull(),
    resource: varchar('resource', { length: 100 }).notNull(),
    resourceId: integer('resource_id'),
    userId: integer('user_id').notNull(),
    changes: jsonb('changes'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    actionIndex: index('audit_logs_action_idx').on(table.action),
    userIdIndex: index('audit_logs_user_id_idx').on(table.userId),
    createdAtIndex: index('audit_logs_created_at_idx').on(table.createdAt),
  }),
);
```


## 前端性能优化设计

### 1. 图像优化策略

#### Next.js Image 组件配置

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'], // 优先 AVIF,降级 WebP
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
};
```

#### 图像处理流程

```mermaid
flowchart TD
    A[上传原图] --> B{检查文件类型}
    B -->|HEIC| C[转换为 JPEG]
    B -->|其他| D[保留原格式]
    C --> E[生成 BlurHash]
    D --> E
    E --> F[生成缩略图]
    F --> G[生成 AVIF 格式]
    G --> H[生成 WebP 格式]
    H --> I[存储到存储源]
    I --> J[更新数据库记录]
```

#### 图像优化实现

```typescript
// app/lib/image-optimizer.ts
import sharp from 'sharp';
import { encode } from 'blurhash';

export interface ImageVariant {
  format: 'avif' | 'webp' | 'jpeg';
  size: 'thumbnail' | 'medium' | 'large' | 'original';
  width: number;
  height: number;
  quality: number;
}

export const IMAGE_SIZES = {
  thumbnail: { width: 400, height: 400 },
  medium: { width: 1200, height: 1200 },
  large: { width: 2400, height: 2400 },
} as const;

export const IMAGE_QUALITY = {
  avif: 80,
  webp: 85,
  jpeg: 90,
} as const;

export class ImageOptimizer {
  /**
   * 生成图像的所有变体
   */
  async generateVariants(
    inputPath: string,
    outputDir: string,
    fileId: number,
  ): Promise<OptimizedImage> {
    const variants: OptimizedImage['variants'] = [];
    
    // 读取原图
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    // 生成 BlurHash
    const blurHash = await this.generateBlurHash(inputPath);
    
    // 生成各种尺寸和格式
    for (const [sizeName, dimensions] of Object.entries(IMAGE_SIZES)) {
      for (const format of ['avif', 'webp', 'jpeg'] as const) {
        const outputPath = `${outputDir}/${fileId}_${sizeName}.${format}`;
        
        const resized = image
          .clone()
          .resize(dimensions.width, dimensions.height, {
            fit: 'inside',
            withoutEnlargement: true,
          });
        
        if (format === 'avif') {
          await resized.avif({ quality: IMAGE_QUALITY.avif }).toFile(outputPath);
        } else if (format === 'webp') {
          await resized.webp({ quality: IMAGE_QUALITY.webp }).toFile(outputPath);
        } else {
          await resized.jpeg({ quality: IMAGE_QUALITY.jpeg }).toFile(outputPath);
        }
        
        const stats = await fs.stat(outputPath);
        const variantMetadata = await sharp(outputPath).metadata();
        
        variants.push({
          format,
          size: sizeName,
          url: outputPath,
          width: variantMetadata.width!,
          height: variantMetadata.height!,
          fileSize: stats.size,
        });
      }
    }
    
    return {
      id: fileId,
      originalUrl: inputPath,
      variants,
      blurHash,
    };
  }
  
  /**
   * 生成 BlurHash
   */
  async generateBlurHash(imagePath: string): Promise<string> {
    const image = sharp(imagePath);
    const { data, info } = await image
      .raw()
      .ensureAlpha()
      .resize(32, 32, { fit: 'inside' })
      .toBuffer({ resolveWithObject: true });
    
    return encode(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
      4,
      4,
    );
  }
  
  /**
   * 检查是否已存在优化后的图像(秒传)
   */
  async checkExistingVariants(fileHash: string): Promise<OptimizedImage | null> {
    // 从 Redis 或数据库查询
    const cached = await redis.get(CacheKeys.instantUpload(fileHash));
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  }
}
```

#### 响应式图像组件

```typescript
// app/ui/components/optimized-image.tsx
'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Blurhash } from 'react-blurhash';

interface OptimizedImageProps {
  src: string;
  alt: string;
  blurHash?: string;
  width: number;
  height: number;
  priority?: boolean;
  sizes?: string;
}

export function OptimizedImage({
  src,
  alt,
  blurHash,
  width,
  height,
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  
  return (
    <div className="relative overflow-hidden">
      {/* BlurHash 占位符 */}
      {blurHash && !isLoaded && (
        <Blurhash
          hash={blurHash}
          width={width}
          height={height}
          resolutionX={32}
          resolutionY={32}
          punch={1}
          className="absolute inset-0"
        />
      )}
      
      {/* Next.js Image 组件 */}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
        quality={90}
        onLoad={() => setIsLoaded(true)}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
```

### 2. 虚拟滚动实现

#### TanStack Virtual 配置

```typescript
// app/ui/components/virtual-scroller.tsx
'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface VirtualScrollerProps<T> {
  items: T[];
  estimateSize: (index: number) => number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
}

export function VirtualScroller<T>({
  items,
  estimateSize,
  renderItem,
  overscan = 5,
  className,
}: VirtualScrollerProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan,
  });
  
  return (
    <div
      ref={parentRef}
      className={`h-full overflow-auto ${className}`}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 画廊虚拟滚动应用

```typescript
// app/ui/front/gallery/virtual-gallery-grid.tsx
'use client';

import { VirtualScroller } from '@/app/ui/components/virtual-scroller';
import { OptimizedImage } from '@/app/ui/components/optimized-image';
import type { MediaFile } from '@/app/lib/definitions';

interface VirtualGalleryGridProps {
  items: MediaFile[];
  columns?: number;
}

export function VirtualGalleryGrid({
  items,
  columns = 3,
}: VirtualGalleryGridProps) {
  // 计算每行的高度
  const estimateSize = (index: number) => {
    const rowIndex = Math.floor(index / columns);
    // 假设每个项目高度为 300px + 间距
    return 300 + 16;
  };
  
  // 将一维数组转换为行数组
  const rows = [];
  for (let i = 0; i < items.length; i += columns) {
    rows.push(items.slice(i, i + columns));
  }
  
  return (
    <VirtualScroller
      items={rows}
      estimateSize={estimateSize}
      overscan={2}
      className="px-4"
      renderItem={(row, rowIndex) => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {row.map((item) => (
            <div key={item.id} className="aspect-square">
              <OptimizedImage
                src={item.url}
                alt={item.title || ''}
                blurHash={item.blurHash}
                width={400}
                height={400}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          ))}
        </div>
      )}
    />
  );
}
```

### 3. 代码分割策略

#### 路由级代码分割

Next.js App Router 自动实现路由级代码分割,每个页面只加载必需的代码。

#### 组件级动态导入

```typescript
// app/ui/front/gallery/gallery-page.tsx
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { GallerySkeleton } from './gallery-skeleton';

// 动态导入大型组件
const VirtualGalleryGrid = dynamic(
  () => import('./virtual-gallery-grid').then((mod) => mod.VirtualGalleryGrid),
  {
    loading: () => <GallerySkeleton />,
    ssr: false, // 仅客户端渲染
  }
);

const GalleryFilter = dynamic(
  () => import('./gallery-filter').then((mod) => mod.GalleryFilter),
  {
    loading: () => <div className="h-12 bg-zinc-100 animate-pulse rounded" />,
  }
);

// 动态导入 Framer Motion
const MotionDiv = dynamic(
  () => import('framer-motion').then((mod) => mod.motion.div),
  { ssr: false }
);

export function GalleryPage({ items }: { items: MediaFile[] }) {
  return (
    <div>
      <Suspense fallback={<div>Loading filter...</div>}>
        <GalleryFilter />
      </Suspense>
      
      <Suspense fallback={<GallerySkeleton />}>
        <VirtualGalleryGrid items={items} />
      </Suspense>
    </div>
  );
}
```

### 4. 缓存策略

#### ISR (Incremental Static Regeneration)

```typescript
// app/(front)/gallery/page.tsx
import { getGalleryItems } from '@/app/lib/data/front';

export const revalidate = 60; // 每 60 秒重新验证

export default async function GalleryPage() {
  const items = await getGalleryItems();
  
  return <VirtualGalleryGrid items={items} />;
}
```

#### SWR (Stale-While-Revalidate) 客户端缓存

```typescript
// app/ui/hooks/use-gallery-data.ts
'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useGalleryData(mediaType?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/gallery?type=${mediaType || 'all'}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 60 秒内不重复请求
    }
  );
  
  return {
    items: data?.items || [],
    isLoading,
    isError: error,
    refresh: mutate,
  };
}
```

#### Service Worker 缓存

```typescript
// public/sw.js
const CACHE_NAME = 'lumina-v1';
const STATIC_ASSETS = [
  '/',
  '/gallery',
  '/about',
  '/_next/static/css/app.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // 图片资源使用 Cache First 策略
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((fetchResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
  }
  
  // API 请求使用 Network First 策略
  else if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
  }
  
  // 其他资源使用 Stale-While-Revalidate
  else {
    event.respondWith(
      caches.match(event.request).then((response) => {
        const fetchPromise = fetch(event.request).then((fetchResponse) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, fetchResponse.clone());
          });
          return fetchResponse;
        });
        return response || fetchPromise;
      })
    );
  }
});
```

### 5. 字体优化

```typescript
// app/layout.tsx
import { Open_Sans, Lora, Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google';

const openSans = Open_Sans({
  subsets: ['latin'],
  display: 'swap', // 使用 font-display: swap
  variable: '--font-sans',
  preload: true,
});

const lora = Lora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
  preload: true,
});

const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans-sc',
  preload: true,
  weight: ['400', '500', '700'],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-CN"
      className={`${openSans.variable} ${lora.variable} ${notoSansSC.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
```

### 6. 关键 CSS 内联

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  experimental: {
    optimizeCss: true, // 启用 CSS 优化
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production', // 生产环境移除 console
  },
};
```


## 后端性能优化设计

### 1. Redis 缓存架构

#### 缓存层实现

```typescript
// app/lib/cache.ts
import Redis from 'ioredis';
import { CacheKeys, CacheTTL } from './cache-keys';

class CacheManager {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });
  }
  
  /**
   * 获取缓存
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null;
    }
  }
  
  /**
   * 设置缓存
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      logger.error('Cache set error', { key, error });
    }
  }
  
  /**
   * 删除缓存
   */
  async del(key: string | string[]): Promise<void> {
    try {
      if (Array.isArray(key)) {
        await this.redis.del(...key);
      } else {
        await this.redis.del(key);
      }
    } catch (error) {
      logger.error('Cache delete error', { key, error });
    }
  }
  
  /**
   * 批量删除(按模式)
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      logger.error('Cache delete pattern error', { pattern, error });
    }
  }
  
  /**
   * 缓存包装器 - Cache-Aside 模式
   */
  async wrap<T>(
    key: string,
    ttl: number,
    fetcher: () => Promise<T>
  ): Promise<T> {
    // 1. 尝试从缓存获取
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    // 2. 缓存未命中,执行查询
    const data = await fetcher();
    
    // 3. 写入缓存
    await this.set(key, data, ttl);
    
    return data;
  }
  
  /**
   * 获取缓存统计
   */
  async getStats() {
    const info = await this.redis.info('stats');
    const lines = info.split('\r\n');
    const stats: Record<string, string> = {};
    
    lines.forEach((line) => {
      const [key, value] = line.split(':');
      if (key && value) {
        stats[key] = value;
      }
    });
    
    return {
      hits: parseInt(stats.keyspace_hits || '0'),
      misses: parseInt(stats.keyspace_misses || '0'),
      hitRate: stats.keyspace_hits
        ? (parseInt(stats.keyspace_hits) /
            (parseInt(stats.keyspace_hits) + parseInt(stats.keyspace_misses))) *
          100
        : 0,
    };
  }
}

export const cache = new CacheManager();
```

#### 缓存应用示例

```typescript
// app/lib/data/front.ts
import { cache } from '../cache';
import { CacheKeys, CacheTTL } from '../cache-keys';

export async function getGalleryItems(
  mediaType: string = 'all',
  page: number = 1,
  limit: number = 50
) {
  const cacheKey = CacheKeys.galleryList(mediaType, page, limit);
  
  return cache.wrap(cacheKey, CacheTTL.galleryList, async () => {
    // 实际数据库查询
    const query = db
      .select()
      .from(files)
      .where(eq(files.isPublished, true))
      .orderBy(desc(files.mtime))
      .limit(limit)
      .offset((page - 1) * limit);
    
    if (mediaType !== 'all') {
      query.where(eq(files.mediaType, mediaType));
    }
    
    return await query;
  });
}

export async function getCollectionDetail(id: number) {
  const cacheKey = CacheKeys.collectionDetail(id);
  
  return cache.wrap(cacheKey, CacheTTL.collectionDetail, async () => {
    return await db
      .select()
      .from(collections)
      .where(eq(collections.id, id))
      .limit(1)
      .then((rows) => rows[0]);
  });
}
```

#### 缓存失效策略

```typescript
// app/lib/actions/media.ts
'use server';

import { cache } from '../cache';
import { CacheKeys } from '../cache-keys';

export async function updateMediaPublishStatus(
  fileId: number,
  isPublished: boolean
) {
  // 1. 更新数据库
  await db
    .update(files)
    .set({ isPublished, updatedAt: new Date() })
    .where(eq(files.id, fileId));
  
  // 2. 清除相关缓存
  await cache.delPattern('gallery:list:*'); // 清除所有画廊列表缓存
  await cache.del(CacheKeys.mediaDetail(fileId)); // 清除媒体详情缓存
  
  // 3. 如果媒体属于作品集,清除作品集缓存
  const collectionIds = await db
    .select({ collectionId: collectionMedia.collectionId })
    .from(collectionMedia)
    .where(eq(collectionMedia.fileId, fileId));
  
  for (const { collectionId } of collectionIds) {
    await cache.del([
      CacheKeys.collectionDetail(collectionId),
      CacheKeys.collectionMedia(collectionId),
    ]);
  }
  
  return { success: true };
}
```

### 2. 数据库连接池

```typescript
// app/lib/drizzle.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;

// 配置连接池
const client = postgres(connectionString, {
  max: 20, // 最大连接数
  idle_timeout: 20, // 空闲超时(秒)
  connect_timeout: 10, // 连接超时(秒)
  prepare: true, // 使用预编译语句
  onnotice: () => {}, // 忽略 NOTICE
});

export const db = drizzle(client);

// 健康检查
export async function checkDatabaseConnection() {
  try {
    await client`SELECT 1`;
    return { status: 'up', latency: 0 };
  } catch (error) {
    logger.error('Database connection check failed', { error });
    return { status: 'down', latency: 0 };
  }
}
```

### 3. 查询优化

#### 避免 N+1 问题

```typescript
// app/lib/data/collections.ts

// ❌ 错误: N+1 查询
export async function getCollectionsWithMediaBad() {
  const collections = await db.select().from(collections);
  
  for (const collection of collections) {
    // 每个作品集都会执行一次查询
    collection.media = await db
      .select()
      .from(collectionMedia)
      .where(eq(collectionMedia.collectionId, collection.id));
  }
  
  return collections;
}

// ✅ 正确: 使用 JOIN 一次查询
export async function getCollectionsWithMedia() {
  return await db
    .select({
      collection: collections,
      media: files,
    })
    .from(collections)
    .leftJoin(
      collectionMedia,
      eq(collections.id, collectionMedia.collectionId)
    )
    .leftJoin(files, eq(collectionMedia.fileId, files.id))
    .where(eq(collections.status, 'published'));
}
```

#### 游标分页

```typescript
// app/lib/data/media.ts

// ❌ 错误: OFFSET 分页(大偏移量性能差)
export async function getMediaWithOffsetPagination(page: number, limit: number) {
  return await db
    .select()
    .from(files)
    .orderBy(desc(files.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
}

// ✅ 正确: 游标分页
export async function getMediaWithCursorPagination(
  cursor?: number,
  limit: number = 50
) {
  const query = db
    .select()
    .from(files)
    .orderBy(desc(files.id))
    .limit(limit + 1); // 多查一条判断是否有下一页
  
  if (cursor) {
    query.where(lt(files.id, cursor));
  }
  
  const items = await query;
  const hasMore = items.length > limit;
  
  if (hasMore) {
    items.pop(); // 移除多查的那一条
  }
  
  return {
    items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
    hasMore,
  };
}
```

### 4. 分片上传实现

#### 分片上传流程

```mermaid
sequenceDiagram
    participant Client as 客户端
    participant API as API Server
    participant Redis as Redis
    participant Storage as 存储源
    participant DB as Database
    
    Client->>API: 1. 初始化上传(文件信息+哈希)
    API->>Redis: 检查文件哈希
    
    alt 文件已存在(秒传)
        Redis-->>API: 返回已存在文件
        API-->>Client: 秒传成功
    else 文件不存在
        API->>DB: 创建上传任务
        API->>Redis: 缓存任务信息
        API-->>Client: 返回 uploadId
        
        loop 上传分片
            Client->>API: 2. 上传分片(uploadId + chunkIndex + data)
            API->>Storage: 保存分片
            API->>DB: 更新分片状态
            API->>Redis: 更新进度
            API-->>Client: 返回进度
        end
        
        Client->>API: 3. 完成上传(uploadId)
        API->>Storage: 合并分片
        API->>DB: 创建文件记录
        API->>Redis: 缓存文件哈希
        API-->>Client: 上传完成
    end
```

#### 分片上传实现

```typescript
// app/api/upload/init/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  const { fileName, fileSize, fileHash, mimeType, userStorageId } =
    await request.json();
  
  // 1. 检查是否可以秒传
  const existingFile = await cache.get(CacheKeys.instantUpload(fileHash));
  if (existingFile) {
    return NextResponse.json({
      instant: true,
      file: existingFile,
    });
  }
  
  // 2. 创建上传任务
  const uploadId = nanoid();
  const chunkSize = 5 * 1024 * 1024; // 5MB
  const totalChunks = Math.ceil(fileSize / chunkSize);
  
  const task = await db.insert(uploadTasks).values({
    uploadId,
    userStorageId,
    fileName,
    fileSize,
    fileHash,
    mimeType,
    chunkSize,
    totalChunks,
    targetPath: `uploads/${uploadId}/${fileName}`,
    status: 'pending',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后过期
  }).returning();
  
  // 3. 缓存任务信息
  await cache.set(
    CacheKeys.uploadTask(uploadId),
    task[0],
    CacheTTL.uploadTask
  );
  
  return NextResponse.json({
    instant: false,
    uploadId,
    chunkSize,
    totalChunks,
  });
}
```

```typescript
// app/api/upload/chunk/route.ts
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const uploadId = formData.get('uploadId') as string;
  const chunkIndex = parseInt(formData.get('chunkIndex') as string);
  const chunkData = formData.get('chunk') as Blob;
  const chunkHash = formData.get('chunkHash') as string;
  
  // 1. 获取上传任务
  const task = await cache.get<UploadTask>(CacheKeys.uploadTask(uploadId));
  if (!task) {
    return NextResponse.json({ error: 'Upload task not found' }, { status: 404 });
  }
  
  // 2. 验证分片哈希
  const buffer = Buffer.from(await chunkData.arrayBuffer());
  const calculatedHash = crypto
    .createHash('md5')
    .update(buffer)
    .digest('hex');
  
  if (calculatedHash !== chunkHash) {
    return NextResponse.json({ error: 'Chunk hash mismatch' }, { status: 400 });
  }
  
  // 3. 保存分片到临时目录
  const chunkPath = `temp/${uploadId}/chunk_${chunkIndex}`;
  await storageAdapter.write(chunkPath, buffer);
  
  // 4. 更新分片记录
  await db.insert(uploadChunks).values({
    uploadTaskId: task.id,
    chunkIndex,
    chunkHash,
    chunkSize: buffer.length,
    storagePath: chunkPath,
    status: 'uploaded',
  });
  
  // 5. 更新任务进度
  const uploadedChunks = task.uploadedChunks + 1;
  await db
    .update(uploadTasks)
    .set({ uploadedChunks })
    .where(eq(uploadTasks.uploadId, uploadId));
  
  // 6. 更新缓存
  await cache.set(
    CacheKeys.uploadTask(uploadId),
    { ...task, uploadedChunks },
    CacheTTL.uploadTask
  );
  
  return NextResponse.json({
    success: true,
    progress: {
      uploadedChunks,
      totalChunks: task.totalChunks,
      percentage: (uploadedChunks / task.totalChunks) * 100,
    },
  });
}
```

```typescript
// app/api/upload/complete/route.ts
export async function POST(request: NextRequest) {
  const { uploadId } = await request.json();
  
  // 1. 获取上传任务
  const task = await db
    .select()
    .from(uploadTasks)
    .where(eq(uploadTasks.uploadId, uploadId))
    .limit(1)
    .then((rows) => rows[0]);
  
  if (!task) {
    return NextResponse.json({ error: 'Upload task not found' }, { status: 404 });
  }
  
  // 2. 验证所有分片已上传
  if (task.uploadedChunks !== task.totalChunks) {
    return NextResponse.json(
      { error: 'Not all chunks uploaded' },
      { status: 400 }
    );
  }
  
  // 3. 合并分片
  const chunks = await db
    .select()
    .from(uploadChunks)
    .where(eq(uploadChunks.uploadTaskId, task.id))
    .orderBy(asc(uploadChunks.chunkIndex));
  
  const finalPath = task.targetPath;
  const writeStream = await storageAdapter.createWriteStream(finalPath);
  
  for (const chunk of chunks) {
    const chunkData = await storageAdapter.read(chunk.storagePath);
    writeStream.write(chunkData);
  }
  
  writeStream.end();
  
  // 4. 创建文件记录
  const file = await db.insert(files).values({
    title: task.fileName,
    path: finalPath,
    sourceType: 'local',
    size: task.fileSize,
    mimeType: task.mimeType,
    userStorageId: task.userStorageId,
    mediaType: task.mimeType.startsWith('image/') ? 'image' : 'video',
    fileHash: task.fileHash,
  }).returning();
  
  // 5. 缓存文件哈希(用于秒传)
  await cache.set(
    CacheKeys.instantUpload(task.fileHash),
    file[0],
    CacheTTL.instantUpload
  );
  
  // 6. 清理临时文件
  for (const chunk of chunks) {
    await storageAdapter.delete(chunk.storagePath);
  }
  
  // 7. 更新任务状态
  await db
    .update(uploadTasks)
    .set({ status: 'completed' })
    .where(eq(uploadTasks.id, task.id));
  
  // 8. 异步处理图像优化
  await imageProcessor.processAsync(file[0].id, finalPath);
  
  return NextResponse.json({
    success: true,
    file: file[0],
  });
}
```

### 5. 慢查询监控

```typescript
// app/lib/db-monitor.ts
import { logger } from './logger';

export function monitorQuery<T>(
  queryName: string,
  threshold: number = 3000 // 3秒
) {
  return async (queryFn: () => Promise<T>): Promise<T> => {
    const startTime = Date.now();
    
    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;
      
      if (duration > threshold) {
        logger.warn('Slow query detected', {
          queryName,
          duration,
          threshold,
        });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Query failed', {
        queryName,
        duration,
        error,
      });
      throw error;
    }
  };
}

// 使用示例
export async function getMediaLibrary() {
  return monitorQuery('getMediaLibrary', 3000)(async () => {
    return await db.select().from(files).limit(100);
  });
}
```


## 代码架构优化设计

### 1. TypeScript 类型系统

#### 类型定义组织

```typescript
// app/lib/definitions.ts - 已在前面定义

// 导出所有类型
export * from './definitions';

// 类型守卫
export function isMediaFile(obj: any): obj is MediaFile {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'number' &&
    typeof obj.path === 'string' &&
    typeof obj.mediaType === 'string'
  );
}

export function isImageFile(file: MediaFile): boolean {
  return file.mediaType === 'image';
}

export function isVideoFile(file: MediaFile): boolean {
  return file.mediaType === 'video';
}
```

#### Server Actions 类型定义

```typescript
// app/lib/actions/types.ts
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

// 使用示例
export async function getMediaList(
  page: number,
  limit: number
): Promise<ActionResult<PaginatedResult<MediaFile>>> {
  try {
    const items = await db
      .select()
      .from(files)
      .limit(limit)
      .offset((page - 1) * limit);
    
    const total = await db
      .select({ count: sql<number>`count(*)` })
      .from(files)
      .then((rows) => rows[0].count);
    
    return {
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        hasMore: page * limit < total,
      },
    };
  } catch (error) {
    logger.error('Failed to get media list', { error });
    return {
      success: false,
      error: 'Failed to fetch media list',
      code: 'MEDIA_LIST_ERROR',
    };
  }
}
```

### 2. 错误处理系统

#### 统一错误类型

```typescript
// app/lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Permission denied') {
    super(message, 'PERMISSION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 'RATE_LIMIT', 429);
    this.name = 'RateLimitError';
  }
}
```

#### 全局错误边界

```typescript
// app/ui/components/error-boundary.tsx
'use client';

import { Component, ReactNode } from 'react';
import { logger } from '@/app/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('React Error Boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }
  
  reset = () => {
    this.setState({ hasError: false, error: null });
  };
  
  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950">
            <h2 className="mb-2 text-lg font-semibold text-red-900 dark:text-red-100">
              出错了
            </h2>
            <p className="mb-4 text-sm text-red-700 dark:text-red-300">
              {this.state.error.message}
            </p>
            <button
              onClick={this.reset}
              className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
            >
              重试
            </button>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

#### API 错误处理中间件

```typescript
// app/lib/api-error-handler.ts
import { NextResponse } from 'next/server';
import { AppError } from './errors';
import { logger } from './logger';

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    logger.warn('API error', {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
    });
    
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }
  
  // 未知错误
  logger.error('Unexpected API error', { error });
  
  return NextResponse.json(
    {
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}

// 使用示例
export async function GET(request: NextRequest) {
  try {
    const data = await fetchData();
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 3. 日志系统

#### Pino 日志配置

```typescript
// app/lib/logger.ts
import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  
  // 开发环境使用 pretty 格式
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  
  // 生产环境使用 JSON 格式
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  
  // 基础字段
  base: {
    env: process.env.NODE_ENV,
    app: 'lumina-pro',
  },
  
  // 时间戳
  timestamp: pino.stdTimeFunctions.isoTime,
});

// 创建子日志器
export function createLogger(module: string) {
  return logger.child({ module });
}

// 请求日志中间件
export function logRequest(
  method: string,
  url: string,
  userId?: number
) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  logger.info('Request started', {
    requestId,
    method,
    url,
    userId,
  });
  
  return {
    requestId,
    end: (statusCode: number) => {
      const duration = Date.now() - startTime;
      logger.info('Request completed', {
        requestId,
        method,
        url,
        statusCode,
        duration,
        userId,
      });
    },
  };
}
```

#### 日志轮转配置

```typescript
// scripts/log-rotation.ts
import fs from 'fs';
import path from 'path';
import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);

const LOG_DIR = path.join(process.cwd(), 'logs');
const MAX_LOG_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_LOG_AGE = 30 * 24 * 60 * 60 * 1000; // 30 天

export async function rotateLog(logFile: string) {
  const stats = await fs.promises.stat(logFile);
  
  // 检查文件大小
  if (stats.size > MAX_LOG_SIZE) {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const rotatedFile = `${logFile}.${timestamp}`;
    
    // 重命名当前日志
    await fs.promises.rename(logFile, rotatedFile);
    
    // 压缩旧日志
    const content = await fs.promises.readFile(rotatedFile);
    const compressed = await gzipAsync(content);
    await fs.promises.writeFile(`${rotatedFile}.gz`, compressed);
    await fs.promises.unlink(rotatedFile);
    
    logger.info('Log rotated', { logFile, rotatedFile });
  }
}

export async function cleanOldLogs() {
  const files = await fs.promises.readdir(LOG_DIR);
  const now = Date.now();
  
  for (const file of files) {
    if (!file.endsWith('.gz')) continue;
    
    const filePath = path.join(LOG_DIR, file);
    const stats = await fs.promises.stat(filePath);
    
    if (now - stats.mtimeMs > MAX_LOG_AGE) {
      await fs.promises.unlink(filePath);
      logger.info('Old log deleted', { file });
    }
  }
}
```

### 4. 组件复用策略

#### UI 组件库结构

```
components/ui/          # Shadcn UI 基础组件
├── button.tsx
├── input.tsx
├── dialog.tsx
├── card.tsx
└── ...

app/ui/components/      # 通用业务组件
├── error-boundary.tsx
├── virtual-scroller.tsx
├── optimized-image.tsx
├── loading-spinner.tsx
└── ...

app/ui/front/          # 前台特定组件
├── gallery/
├── hero/
└── ...

app/ui/admin/          # 后台特定组件
├── media/
├── upload/
└── ...
```

#### 组件设计原则

```typescript
// 1. 单一职责 - 每个组件只做一件事
// ✅ 好的设计
export function MediaCard({ media }: { media: MediaFile }) {
  return (
    <Card>
      <OptimizedImage src={media.url} alt={media.title} />
      <CardContent>
        <h3>{media.title}</h3>
      </CardContent>
    </Card>
  );
}

// ❌ 不好的设计 - 组件做太多事情
export function MediaCardWithEverything({ media }: { media: MediaFile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // ... 太多状态和逻辑
  return (/* 复杂的 JSX */);
}

// 2. 组合优于继承
// ✅ 使用组合
export function MediaGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-3 gap-4">{children}</div>;
}

export function GalleryPage() {
  return (
    <MediaGrid>
      {items.map((item) => (
        <MediaCard key={item.id} media={item} />
      ))}
    </MediaGrid>
  );
}

// 3. Props 类型明确
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  children,
}: ButtonProps) {
  // ...
}
```

### 5. 表单验证

#### Zod Schema 定义

```typescript
// app/lib/validations.ts
import { z } from 'zod';

// 媒体上传验证
export const uploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().positive().max(500 * 1024 * 1024), // 最大 500MB
  mimeType: z.enum([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'video/mp4',
    'video/quicktime',
  ]),
  fileHash: z.string().length(32), // MD5 哈希
});

// 作品集创建验证
export const collectionSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  author: z.string().max(255).optional(),
  type: z.enum(['mixed', 'photo', 'video']),
  status: z.enum(['draft', 'published']),
  coverImages: z.array(z.number()).max(3),
});

// 用户设置验证
export const userSettingsSchema = z.object({
  displayName: z.string().min(1).max(100),
  email: z.string().email(),
  language: z.enum(['zh-CN', 'en']),
  theme: z.enum(['light', 'dark', 'system']),
});

// 验证辅助函数
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}
```

#### Server Actions 验证

```typescript
// app/lib/actions/collections.ts
'use server';

import { collectionSchema } from '../validations';
import { ValidationError } from '../errors';

export async function createCollection(formData: FormData) {
  // 1. 验证输入
  const data = {
    title: formData.get('title'),
    description: formData.get('description'),
    type: formData.get('type'),
    status: formData.get('status'),
    coverImages: JSON.parse(formData.get('coverImages') as string),
  };
  
  const validation = validateData(collectionSchema, data);
  
  if (!validation.success) {
    throw new ValidationError(
      'Invalid collection data',
      validation.errors.format()
    );
  }
  
  // 2. 检查权限
  const session = await auth();
  if (!session?.user) {
    throw new AuthenticationError();
  }
  
  // 3. 创建作品集
  const collection = await db.insert(collections).values({
    ...validation.data,
    createdBy: session.user.id,
  }).returning();
  
  // 4. 清除缓存
  await cache.delPattern('collection:*');
  
  return { success: true, data: collection[0] };
}
```


## 安全层设计

### 1. 认证与授权

#### Better Auth 配置

```typescript
// app/lib/auth.ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './drizzle';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 天
    updateAge: 60 * 60 * 24, // 每天更新一次
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 分钟
    },
  },
  advanced: {
    cookiePrefix: 'lumina',
    crossSubDomainCookies: {
      enabled: false,
    },
  },
});

// 权限检查中间件
export async function requireAuth() {
  const session = await auth.api.getSession({
    headers: headers(),
  });
  
  if (!session) {
    throw new AuthenticationError();
  }
  
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  
  if (session.user.role !== 'admin') {
    throw new AuthorizationError();
  }
  
  return session;
}
```

### 2. CSRF 防护

#### CSRF Token 生成与验证

```typescript
// app/lib/csrf.ts
import crypto from 'crypto';
import { cache } from './cache';
import { CacheKeys, CacheTTL } from './cache-keys';

export class CSRFProtection {
  /**
   * 生成 CSRF Token
   */
  static async generateToken(userId: number): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    
    await cache.set(
      CacheKeys.csrfToken(userId),
      token,
      CacheTTL.csrfToken
    );
    
    return token;
  }
  
  /**
   * 验证 CSRF Token
   */
  static async verifyToken(userId: number, token: string): Promise<boolean> {
    const storedToken = await cache.get<string>(CacheKeys.csrfToken(userId));
    
    if (!storedToken) {
      return false;
    }
    
    // 使用时间安全的比较
    return crypto.timingSafeEqual(
      Buffer.from(storedToken),
      Buffer.from(token)
    );
  }
  
  /**
   * CSRF 中间件
   */
  static async middleware(request: NextRequest) {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!session) {
      throw new AuthenticationError();
    }
    
    // GET 请求不需要 CSRF 验证
    if (request.method === 'GET') {
      return;
    }
    
    const token = request.headers.get('x-csrf-token');
    
    if (!token) {
      throw new AppError('CSRF token missing', 'CSRF_MISSING', 403);
    }
    
    const isValid = await this.verifyToken(session.user.id, token);
    
    if (!isValid) {
      throw new AppError('Invalid CSRF token', 'CSRF_INVALID', 403);
    }
  }
}

// 使用示例
export async function POST(request: NextRequest) {
  await CSRFProtection.middleware(request);
  
  // 处理请求...
}
```

#### 客户端 CSRF Token 处理

```typescript
// app/ui/hooks/use-csrf.ts
'use client';

import { useEffect, useState } from 'use';

export function useCSRFToken() {
  const [token, setToken] = useState<string | null>(null);
  
  useEffect(() => {
    // 从 meta 标签或 API 获取 token
    fetch('/api/csrf-token')
      .then((res) => res.json())
      .then((data) => setToken(data.token));
  }, []);
  
  return token;
}

// 使用示例
export function MyForm() {
  const csrfToken = useCSRFToken();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await fetch('/api/some-action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken!,
      },
      body: JSON.stringify(data),
    });
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

### 3. XSS 防护

#### 输入过滤

```typescript
// app/lib/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

export class Sanitizer {
  /**
   * 清理 HTML 内容
   */
  static sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a'],
      ALLOWED_ATTR: ['href', 'target'],
    });
  }
  
  /**
   * 清理用户输入
   */
  static sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // 移除 < >
      .slice(0, 1000); // 限制长度
  }
  
  /**
   * 转义 HTML 特殊字符
   */
  static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };
    
    return text.replace(/[&<>"'/]/g, (char) => map[char]);
  }
}

// 使用示例
export async function createPost(content: string) {
  const sanitized = Sanitizer.sanitizeHtml(content);
  
  await db.insert(posts).values({
    content: sanitized,
  });
}
```

#### 输出转义

```typescript
// app/ui/components/safe-html.tsx
'use client';

import { Sanitizer } from '@/app/lib/sanitize';

interface SafeHtmlProps {
  html: string;
  className?: string;
}

export function SafeHtml({ html, className }: SafeHtmlProps) {
  const sanitized = Sanitizer.sanitizeHtml(html);
  
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
```

### 4. SQL 注入防护

Drizzle ORM 自动使用参数化查询,防止 SQL 注入:

```typescript
// ✅ 安全 - 使用 Drizzle ORM
export async function getMediaByTitle(title: string) {
  return await db
    .select()
    .from(files)
    .where(eq(files.title, title)); // 自动参数化
}

// ❌ 危险 - 直接拼接 SQL(不要这样做)
export async function getMediaByTitleUnsafe(title: string) {
  return await db.execute(
    sql`SELECT * FROM files WHERE title = '${title}'` // SQL 注入风险!
  );
}

// ✅ 安全 - 使用 sql 模板的参数化
export async function searchMedia(keyword: string) {
  return await db.execute(
    sql`SELECT * FROM files WHERE title ILIKE ${`%${keyword}%`}`
  );
}
```

### 5. 速率限制

#### 滑动窗口算法实现

```typescript
// app/lib/rate-limit.ts
import { cache } from './cache';
import { CacheKeys } from './cache-keys';
import { RateLimitError } from './errors';

export interface RateLimitConfig {
  windowMs: number; // 时间窗口(毫秒)
  maxRequests: number; // 最大请求数
}

export class RateLimiter {
  /**
   * 检查速率限制
   */
  static async check(
    identifier: string,
    endpoint: string,
    config: RateLimitConfig
  ): Promise<RateLimitInfo> {
    const key = CacheKeys.rateLimit(endpoint, identifier);
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // 获取当前窗口内的请求记录
    const requests = await cache.get<number[]>(key) || [];
    
    // 过滤掉窗口外的请求
    const validRequests = requests.filter((timestamp) => timestamp > windowStart);
    
    // 检查是否超过限制
    if (validRequests.length >= config.maxRequests) {
      const oldestRequest = Math.min(...validRequests);
      const resetAt = new Date(oldestRequest + config.windowMs);
      
      throw new RateLimitError(
        `Too many requests. Try again after ${resetAt.toISOString()}`
      );
    }
    
    // 添加当前请求
    validRequests.push(now);
    await cache.set(key, validRequests, Math.ceil(config.windowMs / 1000));
    
    return {
      remaining: config.maxRequests - validRequests.length,
      resetAt: new Date(now + config.windowMs),
      limit: config.maxRequests,
    };
  }
}

// 预定义的速率限制配置
export const RateLimits = {
  login: {
    windowMs: 60 * 1000, // 1 分钟
    maxRequests: 5,
  },
  upload: {
    windowMs: 60 * 1000,
    maxRequests: 20,
  },
  search: {
    windowMs: 60 * 1000,
    maxRequests: 30,
  },
  api: {
    windowMs: 60 * 1000,
    maxRequests: 100,
  },
} as const;

// 使用示例
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  
  await RateLimiter.check(ip, 'login', RateLimits.login);
  
  // 处理登录请求...
}
```

### 6. 文件上传安全

#### 文件类型验证

```typescript
// app/lib/file-validator.ts
import { readFile } from 'fs/promises';

export class FileValidator {
  // 允许的 MIME 类型
  private static ALLOWED_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'video/mp4',
    'video/quicktime',
    'image/gif',
  ]);
  
  // 文件签名(魔数)
  private static FILE_SIGNATURES: Record<string, number[]> = {
    'image/jpeg': [0xff, 0xd8, 0xff],
    'image/png': [0x89, 0x50, 0x4e, 0x47],
    'image/gif': [0x47, 0x49, 0x46],
    'video/mp4': [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
  };
  
  /**
   * 验证 MIME 类型
   */
  static isAllowedType(mimeType: string): boolean {
    return this.ALLOWED_TYPES.has(mimeType);
  }
  
  /**
   * 验证文件签名
   */
  static async verifyFileSignature(
    filePath: string,
    expectedType: string
  ): Promise<boolean> {
    const signature = this.FILE_SIGNATURES[expectedType];
    if (!signature) return true; // 没有签名定义,跳过验证
    
    const buffer = await readFile(filePath);
    const fileSignature = Array.from(buffer.slice(0, signature.length));
    
    return signature.every((byte, index) => byte === fileSignature[index]);
  }
  
  /**
   * 验证文件大小
   */
  static isValidSize(size: number, maxSize: number = 500 * 1024 * 1024): boolean {
    return size > 0 && size <= maxSize;
  }
  
  /**
   * 扫描恶意代码特征
   */
  static async scanForMalware(filePath: string): Promise<boolean> {
    const content = await readFile(filePath, 'utf-8').catch(() => '');
    
    // 检查常见的恶意代码模式
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /onerror=/i,
      /onload=/i,
      /<iframe/i,
    ];
    
    return !maliciousPatterns.some((pattern) => pattern.test(content));
  }
  
  /**
   * 完整的文件验证
   */
  static async validate(
    filePath: string,
    mimeType: string,
    size: number
  ): Promise<{ valid: boolean; error?: string }> {
    // 1. 检查 MIME 类型
    if (!this.isAllowedType(mimeType)) {
      return { valid: false, error: 'File type not allowed' };
    }
    
    // 2. 检查文件大小
    if (!this.isValidSize(size)) {
      return { valid: false, error: 'File size exceeds limit' };
    }
    
    // 3. 验证文件签名
    const signatureValid = await this.verifyFileSignature(filePath, mimeType);
    if (!signatureValid) {
      return { valid: false, error: 'File signature mismatch' };
    }
    
    // 4. 扫描恶意代码
    const isSafe = await this.scanForMalware(filePath);
    if (!isSafe) {
      return { valid: false, error: 'Malicious content detected' };
    }
    
    return { valid: true };
  }
}
```

### 7. 安全响应头

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // 安全响应头
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
  );
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### 8. EXIF GPS 数据脱敏

```typescript
// app/lib/metadata-extractor.ts
import exifr from 'exifr';

export interface ExifOptions {
  preserveGPS?: boolean; // 是否保留 GPS 数据
}

export async function extractMetadata(
  filePath: string,
  options: ExifOptions = {}
) {
  const exif = await exifr.parse(filePath, {
    gps: options.preserveGPS ?? false, // 默认不提取 GPS
  });
  
  if (!exif) return null;
  
  // 如果不保留 GPS,确保删除所有 GPS 相关字段
  if (!options.preserveGPS) {
    delete exif.GPSLatitude;
    delete exif.GPSLongitude;
    delete exif.GPSAltitude;
    delete exif.GPSLatitudeRef;
    delete exif.GPSLongitudeRef;
  }
  
  return {
    camera: exif.Make,
    lens: exif.LensModel,
    dateShot: exif.DateTimeOriginal,
    exposure: exif.ExposureTime,
    aperture: exif.FNumber,
    iso: exif.ISO,
    focalLength: exif.FocalLength,
    // 仅在用户明确允许时包含 GPS
    ...(options.preserveGPS && exif.GPSLatitude
      ? {
          gpsLatitude: exif.GPSLatitude,
          gpsLongitude: exif.GPSLongitude,
        }
      : {}),
  };
}
```


## Testing Strategy

### 1. 测试金字塔

```
        /\
       /  \
      / E2E \      10% - 端到端测试
     /______\
    /        \
   /Integration\ 20% - 集成测试
  /____________\
 /              \
/  Unit Tests    \ 70% - 单元测试
/__________________\
```

### 2. 单元测试 (Vitest)

#### Vitest 配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'vitest.config.ts',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

#### 工具函数测试

```typescript
// app/lib/__tests__/cache-keys.test.ts
import { describe, it, expect } from 'vitest';
import { CacheKeys } from '../cache-keys';

describe('CacheKeys', () => {
  it('should generate correct gallery list key', () => {
    const key = CacheKeys.galleryList('image', 1, 50);
    expect(key).toBe('gallery:list:image:1:50');
  });
  
  it('should generate correct collection detail key', () => {
    const key = CacheKeys.collectionDetail(123);
    expect(key).toBe('collection:detail:123');
  });
  
  it('should generate correct rate limit key', () => {
    const key = CacheKeys.rateLimit('login', '192.168.1.1');
    expect(key).toBe('ratelimit:login:192.168.1.1');
  });
});
```

```typescript
// app/lib/__tests__/sanitize.test.ts
import { describe, it, expect } from 'vitest';
import { Sanitizer } from '../sanitize';

describe('Sanitizer', () => {
  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("xss")</script>';
      const output = Sanitizer.sanitizeHtml(input);
      expect(output).not.toContain('<script>');
      expect(output).toContain('<p>Hello</p>');
    });
    
    it('should allow safe tags', () => {
      const input = '<p><strong>Bold</strong> and <em>italic</em></p>';
      const output = Sanitizer.sanitizeHtml(input);
      expect(output).toBe(input);
    });
  });
  
  describe('escapeHtml', () => {
    it('should escape special characters', () => {
      const input = '<div>"Hello" & \'World\'</div>';
      const output = Sanitizer.escapeHtml(input);
      expect(output).toBe('&lt;div&gt;&quot;Hello&quot; &amp; &#x27;World&#x27;&lt;&#x2F;div&gt;');
    });
  });
});
```

#### 组件测试

```typescript
// app/ui/components/__tests__/optimized-image.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { OptimizedImage } from '../optimized-image';

describe('OptimizedImage', () => {
  it('should render with blur hash placeholder', () => {
    render(
      <OptimizedImage
        src="/test.jpg"
        alt="Test image"
        blurHash="LEHV6nWB2yk8pyo0adR*.7kCMdnj"
        width={400}
        height={400}
      />
    );
    
    expect(screen.getByAltText('Test image')).toBeInTheDocument();
  });
  
  it('should hide placeholder after image loads', async () => {
    const { container } = render(
      <OptimizedImage
        src="/test.jpg"
        alt="Test image"
        blurHash="LEHV6nWB2yk8pyo0adR*.7kCMdnj"
        width={400}
        height={400}
      />
    );
    
    const img = screen.getByAltText('Test image');
    
    // 模拟图片加载完成
    img.dispatchEvent(new Event('load'));
    
    await waitFor(() => {
      expect(img).toHaveClass('opacity-100');
    });
  });
});
```

### 3. 集成测试

#### Server Actions 测试

```typescript
// app/lib/actions/__tests__/media.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { updateMediaPublishStatus } from '../media';
import { db } from '../../drizzle';
import { files } from '../../schema';
import { eq } from 'drizzle-orm';

describe('Media Actions', () => {
  let testFileId: number;
  
  beforeEach(async () => {
    // 创建测试数据
    const result = await db.insert(files).values({
      title: 'Test Image',
      path: '/test/image.jpg',
      sourceType: 'local',
      size: 1024,
      mimeType: 'image/jpeg',
      userStorageId: 1,
      mediaType: 'image',
      isPublished: false,
    }).returning();
    
    testFileId = result[0].id;
  });
  
  afterEach(async () => {
    // 清理测试数据
    await db.delete(files).where(eq(files.id, testFileId));
  });
  
  it('should update publish status', async () => {
    const result = await updateMediaPublishStatus(testFileId, true);
    
    expect(result.success).toBe(true);
    
    const updated = await db
      .select()
      .from(files)
      .where(eq(files.id, testFileId))
      .limit(1)
      .then((rows) => rows[0]);
    
    expect(updated.isPublished).toBe(true);
  });
});
```

#### API 路由测试

```typescript
// app/api/gallery/__tests__/route.test.ts
import { describe, it, expect } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';

describe('Gallery API', () => {
  it('should return gallery items', async () => {
    const request = new NextRequest('http://localhost:3000/api/gallery?type=image');
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBe(true);
  });
  
  it('should filter by media type', async () => {
    const request = new NextRequest('http://localhost:3000/api/gallery?type=video');
    const response = await GET(request);
    const data = await response.json();
    
    expect(data.items.every((item: any) => item.mediaType === 'video')).toBe(true);
  });
});
```

### 4. E2E 测试 (Playwright)

#### Playwright 配置

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### 用户登录流程测试

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=欢迎')).toBeVisible();
  });
  
  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });
});
```

#### 媒体上传流程测试

```typescript
// e2e/upload.spec.ts
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Media Upload', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });
  
  test('should upload image successfully', async ({ page }) => {
    await page.goto('/dashboard/upload');
    
    // 选择文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, 'fixtures/test-image.jpg'));
    
    // 等待上传完成
    await expect(page.locator('text=上传成功')).toBeVisible({ timeout: 30000 });
    
    // 验证文件出现在媒体库
    await page.goto('/dashboard/media');
    await expect(page.locator('img[alt*="test-image"]')).toBeVisible();
  });
  
  test('should show progress during upload', async ({ page }) => {
    await page.goto('/dashboard/upload');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, 'fixtures/large-video.mp4'));
    
    // 验证进度条显示
    await expect(page.locator('[role="progressbar"]')).toBeVisible();
    await expect(page.locator('text=%')).toBeVisible();
  });
});
```

#### 画廊浏览测试

```typescript
// e2e/gallery.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Gallery', () => {
  test('should display gallery items', async ({ page }) => {
    await page.goto('/gallery');
    
    // 等待图片加载
    await page.waitForSelector('img[alt]', { timeout: 10000 });
    
    // 验证至少有一张图片
    const images = page.locator('img[alt]');
    await expect(images).toHaveCount({ min: 1 });
  });
  
  test('should filter by media type', async ({ page }) => {
    await page.goto('/gallery');
    
    // 点击视频筛选
    await page.click('button:has-text("视频")');
    
    // 等待筛选完成
    await page.waitForTimeout(1000);
    
    // 验证 URL 参数
    expect(page.url()).toContain('type=video');
  });
  
  test('should implement virtual scrolling', async ({ page }) => {
    await page.goto('/gallery');
    
    // 获取初始渲染的项目数
    const initialCount = await page.locator('[data-index]').count();
    
    // 滚动到底部
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    
    // 验证加载了更多项目
    const afterScrollCount = await page.locator('[data-index]').count();
    expect(afterScrollCount).toBeGreaterThan(initialCount);
  });
});
```

### 5. 性能测试

```typescript
// e2e/performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('should meet Web Vitals thresholds', async ({ page }) => {
    await page.goto('/gallery');
    
    // 收集 Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: Record<string, number> = {};
        
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            vitals[entry.name] = entry.value;
          }
        }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
        
        setTimeout(() => resolve(vitals), 5000);
      });
    });
    
    // 验证 LCP < 2.5s
    expect(metrics['largest-contentful-paint']).toBeLessThan(2500);
    
    // 验证 CLS < 0.1
    expect(metrics['cumulative-layout-shift']).toBeLessThan(0.1);
  });
  
  test('should load images efficiently', async ({ page }) => {
    await page.goto('/gallery');
    
    // 监听网络请求
    const imageRequests: string[] = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'image') {
        imageRequests.push(request.url());
      }
    });
    
    await page.waitForTimeout(3000);
    
    // 验证使用了现代图片格式
    const modernFormats = imageRequests.filter(
      (url) => url.includes('.avif') || url.includes('.webp')
    );
    
    expect(modernFormats.length).toBeGreaterThan(0);
  });
});
```

### 6. CI/CD 测试流水线

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run unit tests
        run: pnpm test:unit
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json
  
  integration-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run migrations
        run: pnpm db:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      
      - name: Run integration tests
        run: pnpm test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          REDIS_HOST: localhost
  
  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps
      
      - name: Run E2E tests
        run: pnpm test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```


## 监控与日志体系设计

### 1. Web Vitals 监控

#### 客户端收集

```typescript
// app/ui/components/web-vitals-reporter.tsx
'use client';

import { useEffect } from 'react';
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

export function WebVitalsReporter() {
  useEffect(() => {
    // 收集所有 Web Vitals 指标
    onCLS((metric) => sendToAnalytics(metric));
    onFID((metric) => sendToAnalytics(metric));
    onFCP((metric) => sendToAnalytics(metric));
    onLCP((metric) => sendToAnalytics(metric));
    onTTFB((metric) => sendToAnalytics(metric));
  }, []);
  
  return null;
}

async function sendToAnalytics(metric: any) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    page: window.location.pathname,
    userAgent: navigator.userAgent,
  });
  
  // 使用 sendBeacon 确保数据发送
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/vitals', body);
  } else {
    fetch('/api/analytics/vitals', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    });
  }
}
```

#### 服务端存储

```typescript
// app/api/analytics/vitals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/drizzle';
import { performanceMetrics } from '@/app/lib/schema';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    await db.insert(performanceMetrics).values({
      metricName: data.name,
      metricValue: data.value,
      rating: data.rating,
      page: data.page,
      userAgent: data.userAgent,
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to save Web Vitals', { error });
    return NextResponse.json({ error: 'Failed to save metrics' }, { status: 500 });
  }
}
```

### 2. 错误追踪 (Sentry 集成)

#### Sentry 配置

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // 环境
  environment: process.env.NODE_ENV,
  
  // 采样率
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // 性能监控
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: ['localhost', /^https:\/\/yoursite\.com/],
    }),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // 过滤敏感信息
  beforeSend(event, hint) {
    // 移除敏感数据
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
    }
    
    return event;
  },
});
```

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  
  integrations: [
    new Sentry.Integrations.Postgres(),
    new Sentry.Integrations.Http({ tracing: true }),
  ],
});
```

#### 手动错误上报

```typescript
// app/lib/error-reporter.ts
import * as Sentry from '@sentry/nextjs';

export function reportError(
  error: Error,
  context?: Record<string, any>
) {
  Sentry.captureException(error, {
    extra: context,
  });
  
  logger.error('Error reported to Sentry', {
    error: error.message,
    stack: error.stack,
    context,
  });
}

export function reportMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, any>
) {
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}
```

### 3. 日志聚合

#### 结构化日志

```typescript
// app/lib/logger.ts (扩展)
export const logger = pino({
  // ... 之前的配置
  
  // 自定义序列化器
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: {
        host: req.headers.host,
        'user-agent': req.headers['user-agent'],
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },
  
  // 重定向到文件
  transport: process.env.NODE_ENV === 'production'
    ? {
        targets: [
          {
            target: 'pino/file',
            options: { destination: './logs/app.log' },
          },
          {
            target: 'pino/file',
            level: 'error',
            options: { destination: './logs/error.log' },
          },
        ],
      }
    : undefined,
});

// 请求日志中间件(增强版)
export function createRequestLogger() {
  return (req: Request) => {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    
    const childLogger = logger.child({
      requestId,
      method: req.method,
      url: req.url,
    });
    
    childLogger.info('Request started');
    
    return {
      requestId,
      logger: childLogger,
      end: (statusCode: number, error?: Error) => {
        const duration = Date.now() - startTime;
        
        if (error) {
          childLogger.error({
            msg: 'Request failed',
            statusCode,
            duration,
            error: {
              message: error.message,
              stack: error.stack,
            },
          });
        } else {
          childLogger.info({
            msg: 'Request completed',
            statusCode,
            duration,
          });
        }
      },
    };
  };
}
```

#### 日志查询 API

```typescript
// app/api/admin/logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/drizzle';
import { errorLogs } from '@/app/lib/schema';
import { desc, and, gte, lte, like } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  await requireAdmin();
  
  const searchParams = request.nextUrl.searchParams;
  const level = searchParams.get('level');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  
  const conditions = [];
  
  if (level) {
    conditions.push(eq(errorLogs.level, level));
  }
  
  if (startDate) {
    conditions.push(gte(errorLogs.createdAt, new Date(startDate)));
  }
  
  if (endDate) {
    conditions.push(lte(errorLogs.createdAt, new Date(endDate)));
  }
  
  if (search) {
    conditions.push(like(errorLogs.message, `%${search}%`));
  }
  
  const logs = await db
    .select()
    .from(errorLogs)
    .where(and(...conditions))
    .orderBy(desc(errorLogs.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
  
  const total = await db
    .select({ count: sql<number>`count(*)` })
    .from(errorLogs)
    .where(and(...conditions))
    .then((rows) => rows[0].count);
  
  return NextResponse.json({
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}
```

### 4. 告警系统

#### 告警规则引擎

```typescript
// app/lib/alerting.ts
import { db } from './drizzle';
import { performanceMetrics } from './schema';
import { gte } from 'drizzle-orm';

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  operator: '>' | '<' | '>=' | '<=' | '==';
  duration: number; // 秒
  channels: ('email' | 'slack' | 'webhook')[];
}

export const alertRules: AlertRule[] = [
  {
    id: 'high-lcp',
    name: 'High LCP',
    metric: 'LCP',
    threshold: 2500,
    operator: '>',
    duration: 300, // 5 分钟
    channels: ['email', 'slack'],
  },
  {
    id: 'high-error-rate',
    name: 'High Error Rate',
    metric: 'error_rate',
    threshold: 5, // 5%
    operator: '>',
    duration: 60,
    channels: ['email', 'slack', 'webhook'],
  },
  {
    id: 'slow-api',
    name: 'Slow API Response',
    metric: 'api_response_time',
    threshold: 3000,
    operator: '>',
    duration: 180,
    channels: ['slack'],
  },
];

export class AlertManager {
  /**
   * 检查告警规则
   */
  static async checkRules() {
    for (const rule of alertRules) {
      const shouldAlert = await this.evaluateRule(rule);
      
      if (shouldAlert) {
        await this.triggerAlert(rule);
      }
    }
  }
  
  /**
   * 评估规则
   */
  private static async evaluateRule(rule: AlertRule): Promise<boolean> {
    const since = new Date(Date.now() - rule.duration * 1000);
    
    // 查询指标
    const metrics = await db
      .select()
      .from(performanceMetrics)
      .where(
        and(
          eq(performanceMetrics.metricName, rule.metric),
          gte(performanceMetrics.createdAt, since)
        )
      );
    
    if (metrics.length === 0) return false;
    
    // 计算平均值
    const avg =
      metrics.reduce((sum, m) => sum + m.metricValue, 0) / metrics.length;
    
    // 评估条件
    switch (rule.operator) {
      case '>':
        return avg > rule.threshold;
      case '<':
        return avg < rule.threshold;
      case '>=':
        return avg >= rule.threshold;
      case '<=':
        return avg <= rule.threshold;
      case '==':
        return avg === rule.threshold;
      default:
        return false;
    }
  }
  
  /**
   * 触发告警
   */
  private static async triggerAlert(rule: AlertRule) {
    logger.warn('Alert triggered', { rule });
    
    for (const channel of rule.channels) {
      switch (channel) {
        case 'email':
          await this.sendEmailAlert(rule);
          break;
        case 'slack':
          await this.sendSlackAlert(rule);
          break;
        case 'webhook':
          await this.sendWebhookAlert(rule);
          break;
      }
    }
  }
  
  /**
   * 发送邮件告警
   */
  private static async sendEmailAlert(rule: AlertRule) {
    // 实现邮件发送逻辑
    logger.info('Email alert sent', { rule });
  }
  
  /**
   * 发送 Slack 告警
   */
  private static async sendSlackAlert(rule: AlertRule) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;
    
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 Alert: ${rule.name}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${rule.name}*\nMetric: ${rule.metric}\nThreshold: ${rule.operator} ${rule.threshold}`,
            },
          },
        ],
      }),
    });
  }
  
  /**
   * 发送 Webhook 告警
   */
  private static async sendWebhookAlert(rule: AlertRule) {
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    if (!webhookUrl) return;
    
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rule,
        timestamp: new Date().toISOString(),
      }),
    });
  }
}

// 定时检查告警(每分钟)
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    AlertManager.checkRules().catch((error) => {
      logger.error('Alert check failed', { error });
    });
  }, 60 * 1000);
}
```

### 5. 监控仪表盘

```typescript
// app/dashboard/monitoring/page.tsx
import { db } from '@/app/lib/drizzle';
import { performanceMetrics, errorLogs } from '@/app/lib/schema';
import { desc, gte, sql } from 'drizzle-orm';

export default async function MonitoringPage() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // 最近 24 小时
  
  // Web Vitals 统计
  const vitals = await db
    .select({
      metric: performanceMetrics.metricName,
      avg: sql<number>`AVG(${performanceMetrics.metricValue})`,
      p50: sql<number>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${performanceMetrics.metricValue})`,
      p75: sql<number>`PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ${performanceMetrics.metricValue})`,
      p95: sql<number>`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${performanceMetrics.metricValue})`,
    })
    .from(performanceMetrics)
    .where(gte(performanceMetrics.createdAt, since))
    .groupBy(performanceMetrics.metricName);
  
  // 错误统计
  const errors = await db
    .select({
      level: errorLogs.level,
      count: sql<number>`COUNT(*)`,
    })
    .from(errorLogs)
    .where(gte(errorLogs.createdAt, since))
    .groupBy(errorLogs.level);
  
  // 最近错误
  const recentErrors = await db
    .select()
    .from(errorLogs)
    .where(gte(errorLogs.createdAt, since))
    .orderBy(desc(errorLogs.createdAt))
    .limit(10);
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">系统监控</h1>
      
      {/* Web Vitals */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Web Vitals (24h)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {vitals.map((vital) => (
            <Card key={vital.metric}>
              <CardHeader>
                <CardTitle>{vital.metric}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>平均: {vital.avg.toFixed(2)}ms</div>
                  <div>P50: {vital.p50.toFixed(2)}ms</div>
                  <div>P75: {vital.p75.toFixed(2)}ms</div>
                  <div>P95: {vital.p95.toFixed(2)}ms</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      
      {/* 错误统计 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">错误统计 (24h)</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {errors.map((error) => (
            <Card key={error.level}>
              <CardHeader>
                <CardTitle className="capitalize">{error.level}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{error.count}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      
      {/* 最近错误 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">最近错误</h2>
        <div className="space-y-2">
          {recentErrors.map((error) => (
            <Card key={error.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{error.message}</div>
                    <div className="text-sm text-muted-foreground">
                      {error.createdAt.toLocaleString()}
                    </div>
                  </div>
                  <Badge variant={error.level === 'error' ? 'destructive' : 'secondary'}>
                    {error.level}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
```


## 部署与运维优化设计

### 1. Docker 容器化

#### 多阶段 Dockerfile

```dockerfile
# Dockerfile
# syntax=docker/dockerfile:1

# ============ 依赖阶段 ============
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# ============ 构建阶段 ============
FROM node:22-alpine AS builder
WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置环境变量
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# 构建应用
RUN corepack enable pnpm && pnpm build

# ============ 运行阶段 ============
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 设置权限
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### Next.js Standalone 配置

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: 'standalone', // 启用 standalone 模式
  
  // ... 其他配置
};
```

#### docker-compose.yml

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/lumina
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
  
  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=lumina
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
  
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

### 2. CI/CD 流水线

#### GitHub Actions 完整流水线

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run linter
        run: pnpm lint
      
      - name: Run type check
        run: pnpm tsc --noEmit
      
      - name: Run unit tests
        run: pnpm test:unit
      
      - name: Run integration tests
        run: pnpm test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          REDIS_HOST: localhost
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json
  
  build:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
  
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://lumina.example.com
    
    steps:
      - name: Deploy to production
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            cd /opt/lumina
            docker-compose pull
            docker-compose up -d --no-deps --build app
            docker-compose exec -T app pnpm db:migrate
            
            # 健康检查
            for i in {1..30}; do
              if curl -f http://localhost:3000/health; then
                echo "Deployment successful"
                exit 0
              fi
              echo "Waiting for app to be ready..."
              sleep 2
            done
            
            echo "Deployment failed - rolling back"
            docker-compose down
            docker-compose up -d
            exit 1
      
      - name: Notify deployment
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Deployment to production ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 3. 健康检查

#### 健康检查端点

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/app/lib/drizzle';
import { cache } from '@/app/lib/cache';

export async function GET() {
  const checks = {
    database: { status: 'unknown', latency: 0 },
    redis: { status: 'unknown', latency: 0 },
    storage: { status: 'unknown', available: false },
  };
  
  // 检查数据库
  try {
    const start = Date.now();
    const dbStatus = await checkDatabaseConnection();
    checks.database = {
      status: dbStatus.status,
      latency: Date.now() - start,
    };
  } catch (error) {
    checks.database.status = 'down';
  }
  
  // 检查 Redis
  try {
    const start = Date.now();
    await cache.redis.ping();
    checks.redis = {
      status: 'up',
      latency: Date.now() - start,
    };
  } catch (error) {
    checks.redis.status = 'down';
  }
  
  // 检查存储
  try {
    const storageAvailable = await checkStorageAvailability();
    checks.storage = {
      status: storageAvailable ? 'up' : 'down',
      available: storageAvailable,
    };
  } catch (error) {
    checks.storage.status = 'down';
  }
  
  // 判断整体状态
  const allHealthy = Object.values(checks).every(
    (check) => check.status === 'up'
  );
  
  const status = allHealthy ? 'healthy' : 'degraded';
  const statusCode = allHealthy ? 200 : 503;
  
  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: statusCode }
  );
}

async function checkStorageAvailability(): Promise<boolean> {
  try {
    // 尝试写入测试文件
    const testPath = 'health-check.txt';
    await storageAdapter.write(testPath, Buffer.from('test'));
    await storageAdapter.delete(testPath);
    return true;
  } catch {
    return false;
  }
}
```

### 4. 备份系统

#### 数据库备份脚本

```bash
#!/bin/bash
# scripts/backup-database.sh

set -e

# 配置
BACKUP_DIR="/backups/database"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/lumina_$TIMESTAMP.sql.gz"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 执行备份
echo "Starting database backup..."
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"

# 验证备份
if [ -f "$BACKUP_FILE" ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "Backup completed: $BACKUP_FILE ($SIZE)"
  
  # 计算校验和
  CHECKSUM=$(sha256sum "$BACKUP_FILE" | cut -d' ' -f1)
  echo "$CHECKSUM" > "$BACKUP_FILE.sha256"
  echo "Checksum: $CHECKSUM"
else
  echo "Backup failed!"
  exit 1
fi

# 清理旧备份
echo "Cleaning old backups..."
find "$BACKUP_DIR" -name "lumina_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "lumina_*.sql.gz.sha256" -mtime +$RETENTION_DAYS -delete

echo "Backup process completed"
```

#### 媒体文件备份脚本

```bash
#!/bin/bash
# scripts/backup-media.sh

set -e

# 配置
SOURCE_DIR="/app/uploads"
BACKUP_DIR="/backups/media"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d)
BACKUP_FILE="$BACKUP_DIR/media_$TIMESTAMP.tar.gz"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 执行备份(增量备份)
echo "Starting media backup..."
tar -czf "$BACKUP_FILE" \
  --exclude='*.tmp' \
  --exclude='temp/*' \
  -C "$(dirname $SOURCE_DIR)" \
  "$(basename $SOURCE_DIR)"

# 验证备份
if [ -f "$BACKUP_FILE" ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "Backup completed: $BACKUP_FILE ($SIZE)"
  
  # 计算校验和
  CHECKSUM=$(sha256sum "$BACKUP_FILE" | cut -d' ' -f1)
  echo "$CHECKSUM" > "$BACKUP_FILE.sha256"
  echo "Checksum: $CHECKSUM"
else
  echo "Backup failed!"
  exit 1
fi

# 清理旧备份
echo "Cleaning old backups..."
find "$BACKUP_DIR" -name "media_*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "media_*.tar.gz.sha256" -mtime +$RETENTION_DAYS -delete

echo "Backup process completed"
```

#### 备份恢复脚本

```bash
#!/bin/bash
# scripts/restore-database.sh

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

BACKUP_FILE="$1"
CHECKSUM_FILE="$BACKUP_FILE.sha256"

# 验证备份文件
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

# 验证校验和
if [ -f "$CHECKSUM_FILE" ]; then
  echo "Verifying backup integrity..."
  EXPECTED_CHECKSUM=$(cat "$CHECKSUM_FILE")
  ACTUAL_CHECKSUM=$(sha256sum "$BACKUP_FILE" | cut -d' ' -f1)
  
  if [ "$EXPECTED_CHECKSUM" != "$ACTUAL_CHECKSUM" ]; then
    echo "Checksum mismatch! Backup may be corrupted."
    exit 1
  fi
  echo "Backup integrity verified"
fi

# 确认恢复
read -p "This will overwrite the current database. Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

# 执行恢复
echo "Starting database restore..."
gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"

echo "Database restore completed"
```

#### Cron 定时任务

```bash
# crontab -e

# 每天凌晨 2 点备份数据库
0 2 * * * /opt/lumina/scripts/backup-database.sh >> /var/log/lumina/backup-db.log 2>&1

# 每周日凌晨 3 点备份媒体文件
0 3 * * 0 /opt/lumina/scripts/backup-media.sh >> /var/log/lumina/backup-media.log 2>&1

# 每小时检查告警
0 * * * * cd /opt/lumina && node -e "require('./dist/lib/alerting').AlertManager.checkRules()" >> /var/log/lumina/alerts.log 2>&1
```

### 5. 零停机部署

#### 滚动更新策略

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
      rollback_config:
        parallelism: 1
        delay: 5s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
```

#### 部署脚本

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

echo "Starting deployment..."

# 1. 拉取最新镜像
docker-compose pull app

# 2. 启动新容器(不停止旧容器)
docker-compose up -d --no-deps --scale app=2 --no-recreate app

# 3. 等待新容器健康
echo "Waiting for new container to be healthy..."
sleep 10

NEW_CONTAINER=$(docker-compose ps -q app | head -n 1)

for i in {1..30}; do
  if docker exec "$NEW_CONTAINER" node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"; then
    echo "New container is healthy"
    break
  fi
  
  if [ $i -eq 30 ]; then
    echo "New container failed health check - rolling back"
    docker-compose up -d --no-deps --scale app=1 app
    exit 1
  fi
  
  echo "Waiting for health check... ($i/30)"
  sleep 2
done

# 4. 运行数据库迁移
echo "Running database migrations..."
docker exec "$NEW_CONTAINER" pnpm db:migrate

# 5. 停止旧容器
echo "Stopping old container..."
docker-compose up -d --no-deps --scale app=1 --remove-orphans app

echo "Deployment completed successfully"
```

### 6. 环境配置

#### 环境变量模板

```bash
# .env.example

# ============ 应用配置 ============
NODE_ENV=production
APP_ENV=prod
PORT=3000
HOSTNAME=0.0.0.0

# ============ 数据库 ============
DATABASE_URL=postgresql://user:password@localhost:5432/lumina

# ============ Redis ============
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# ============ 认证 ============
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=https://your-domain.com

# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# ============ 存储 ============
# S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_BUCKET=

# 七牛云
QINIU_ACCESS_KEY=
QINIU_SECRET_KEY=
QINIU_BUCKET=
QINIU_DOMAIN=

# ============ 监控 ============
# Sentry
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# ============ 告警 ============
SLACK_WEBHOOK_URL=
ALERT_WEBHOOK_URL=

# ============ 日志 ============
LOG_LEVEL=info

# ============ 其他 ============
NEXT_TELEMETRY_DISABLED=1
```

#### 配置验证

```typescript
// app/lib/config-validator.ts
import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  DATABASE_URL: z.string().url(),
  REDIS_HOST: z.string(),
  REDIS_PORT: z.string().regex(/^\d+$/),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
});

export function validateConfig() {
  try {
    configSchema.parse(process.env);
    logger.info('Configuration validated successfully');
  } catch (error) {
    logger.error('Configuration validation failed', { error });
    throw new Error('Invalid configuration');
  }
}

// 在应用启动时验证
if (process.env.NODE_ENV === 'production') {
  validateConfig();
}
```

### 7. 运维文档

#### 部署清单

```markdown
# 部署清单

## 部署前检查

- [ ] 所有测试通过
- [ ] 代码已合并到 main 分支
- [ ] 数据库迁移脚本已准备
- [ ] 环境变量已配置
- [ ] 备份已完成
- [ ] 监控系统正常运行

## 部署步骤

1. 拉取最新代码
2. 构建 Docker 镜像
3. 运行数据库迁移
4. 启动新容器
5. 健康检查
6. 切换流量
7. 验证功能
8. 监控指标

## 回滚步骤

1. 停止新容器
2. 启动旧容器
3. 恢复数据库(如需要)
4. 验证功能
5. 通知团队

## 紧急联系人

- 技术负责人: xxx
- 运维负责人: xxx
- 数据库管理员: xxx
```

## Error Handling

### 错误处理策略

1. **数据库连接失败**: 自动重试 3 次,失败后返回 503 状态码
2. **Redis 连接失败**: 降级为无缓存模式,记录警告日志
3. **存储源不可用**: 返回友好错误信息,建议用户稍后重试
4. **图片处理失败**: 保留原始文件,标记处理失败,后台重试
5. **上传超时**: 支持断点续传,保存已上传分片
6. **API 速率限制**: 返回 429 状态码和重试时间
7. **认证失败**: 清除会话,重定向到登录页
8. **权限不足**: 返回 403 状态码和友好提示

## Correctness Properties

本项目不适用基于属性的测试(Property-Based Testing),原因如下:

1. **基础设施即代码(IaC)**: Docker 配置、CI/CD 流水线属于声明式配置,使用快照测试和策略检查更合适
2. **UI 渲染**: 前端组件使用快照测试和视觉回归测试
3. **CRUD 操作**: 简单的数据库操作使用示例测试即可
4. **配置验证**: 使用 Zod schema 验证和示例测试
5. **副作用操作**: 日志记录、告警发送等使用 mock 测试

因此,本设计采用以下测试策略:
- **单元测试**: 覆盖工具函数、数据转换、验证逻辑
- **集成测试**: 覆盖 Server Actions、API 路由、数据库查询
- **E2E 测试**: 覆盖关键用户流程
- **快照测试**: 覆盖 UI 组件、配置文件
- **性能测试**: 验证 Web Vitals 指标

