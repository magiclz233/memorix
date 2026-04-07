# Design Document: Gallery Features Completion

## Overview

本设计文档描述了 Next.js 图库项目的功能完善方案，旨在将半成品功能升级为完整可用的生产级系统。项目采用 Next.js 16 + React 19 + TypeScript 技术栈，使用 Postgres + Drizzle ORM 作为数据层，支持多存储源（本地/NAS/S3），并提供中英文双语国际化支持。

### 核心目标

1. **前台数据真实化**：将硬编码的 Hero 照片和精选集合替换为数据库驱动的真实数据
2. **上传功能实现**：实现完整的文件上传流程，包括多存储源支持、元数据提取和进度反馈
3. **批量操作增强**：添加批量删除和批量下载功能，提升管理效率
4. **实况照片支持**：完善实况照片的前台播放体验
5. **UI/UX 优化**：改进媒体详情模态框、筛选器和前台画廊交互
6. **数据一致性**：修复删除操作的级联清理问题，确保数据完整性

### 技术栈

- **前端框架**：Next.js 16 (App Router) + React 19 + TypeScript
- **样式方案**：Tailwind CSS + Shadcn UI
- **数据库**：PostgreSQL + Drizzle ORM
- **认证**：Better Auth (Email/Password + GitHub OAuth)
- **图像处理**：Sharp + BlurHash + Exifr
- **视频处理**：FFmpeg (通过 fluent-ffmpeg)
- **存储支持**：本地文件系统、NAS、AWS S3
- **国际化**：next-intl (简体中文 + 英文)

### 设计风格

Lumina Pro 双模态设计：
- **Light Mode**：极简杂志风，高亮白底、深灰文字、细腻阴影
- **Dark Mode**：流光黑洞风，深邃黑底、indigo/violet 霓虹光晕、玻璃拟态质感


## Architecture

### 系统架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │  Public Pages    │  │  Dashboard Pages │  │  API Routes   │ │
│  │  - Home (Hero)   │  │  - Media Library │  │  - /upload    │ │
│  │  - Gallery       │  │  - Upload Center │  │  - /download  │ │
│  │  - Collections   │  │  - Collections   │  │  - /media/*   │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Business Logic Layer                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │  Server Actions  │  │  Data Queries    │  │  File Ops     │ │
│  │  - Upload        │  │  - fetchHero     │  │  - Storage    │ │
│  │  - Delete        │  │  - fetchMedia    │  │  - Scan       │ │
│  │  - Download      │  │  - fetchCollect  │  │  - Metadata   │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        Data Layer                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │  PostgreSQL DB   │  │  File Storage    │  │  Cache Layer  │ │
│  │  - files         │  │  - Local/NAS     │  │  - Thumbnails │ │
│  │  - collections   │  │  - S3            │  │  - BlurHash   │ │
│  │  - metadata      │  │                  │  │               │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 核心模块交互

#### 1. Hero 照片数据流

```
FrontHome Component
    ↓ (SSR/SSG)
fetchHeroPhotosForHome()
    ↓ (Query DB)
user_settings.hero_images → files table
    ↓ (Filter published & enabled)
Return photo data with URLs
    ↓ (Render)
Hero Carousel with real images
```

#### 2. 上传流程

```
Upload Center UI
    ↓ (Select files)
Client-side validation
    ↓ (FormData)
POST /api/upload
    ↓ (Verify admin)
Save to storage (local/nas/s3)
    ↓ (Insert DB)
Create files record
    ↓ (Background job)
Extract metadata (EXIF/FFmpeg)
    ↓ (Generate)
Thumbnail + BlurHash
    ↓ (Revalidate)
Update Media Library
```

#### 3. 批量删除流程

```
Media Library UI
    ↓ (Select items)
Batch Delete Action
    ↓ (Confirm dialog)
Server Action: deleteMediaFiles()
    ↓ (Transaction start)
├─ Delete from collection_media
├─ Delete from photo_metadata
├─ Delete from video_metadata
├─ Delete from files
├─ Clean hero_images references
├─ Clean collection coverImages
└─ Delete physical files
    ↓ (Transaction commit)
Revalidate pages
```


## Components and Interfaces

### 1. Hero 照片真实数据连接

#### 1.1 数据查询函数

**文件位置**：`app/lib/data.ts`

现有函数 `fetchHeroPhotosForHome()` 已实现，需要在前台组件中集成：

```typescript
// 已存在的函数签名
export async function fetchHeroPhotosForHome(options?: { 
  userId?: number; 
  limit?: number 
}): Promise<Array<{
  id: number;
  title: string | null;
  path: string;
  mtime: Date | null;
}>>
```

#### 1.2 前台组件修改

**文件位置**：`app/ui/front/front-home.tsx`

需要修改的部分：

```typescript
// 当前硬编码的图片数组
const HERO_IMAGES = {
  desktop: ['/hero-desktop.png', '/hero1.jpg', ...],
  mobile: ['/hero-mobile.png', '/hero1.jpg', ...]
};

// 修改为：从服务端获取真实数据
// 在页面组件中调用 fetchHeroPhotosForHome()
// 转换为 { desktop: string[], mobile: string[] } 格式
// 如果返回空数组，使用 HERO_IMAGES 作为降级方案
```

**实现策略**：
- 在 `app/[locale]/(front)/page.tsx` 中调用 `fetchHeroPhotosForHome()`
- 将结果通过 props 传递给 `FrontHome` 组件
- 使用 `/api/media/thumb/[id]` 生成缩略图 URL
- 保持现有的轮播逻辑和色调检测逻辑不变

#### 1.3 API 端点

**文件位置**：`app/api/media/thumb/[id]/route.ts` (已存在)

用于提供 Hero 照片的缩略图。

### 2. 精选集合真实数据连接

#### 2.1 数据查询函数

**文件位置**：`app/lib/data.ts`

现有函数 `fetchCollections()` 已实现：

```typescript
export async function fetchCollections(
  options: FetchCollectionsOptions = {}
): Promise<CollectionListItem[]>

type FetchCollectionsOptions = {
  type?: CollectionType | 'all';
  status?: CollectionStatus | 'all';
  limit?: number;
  offset?: number;
  orderBy?: 'createdAtDesc' | 'createdAtAsc' | 'updatedAtDesc';
};
```

#### 2.2 前台组件修改

**文件位置**：`app/ui/front/front-home.tsx`

需要修改的部分：

```typescript
// 当前使用假数据
const featured = featuredCollections.slice(0, 3);

// 修改为：从服务端获取真实数据
// 调用 fetchCollections({ status: 'published', limit: 3 })
// 使用集合的 covers 数组作为封面
// 如果 covers 为空，使用默认封面（已在 fetchCollections 中处理）
```

**实现策略**：
- 在 `app/[locale]/(front)/page.tsx` 中调用 `fetchCollections()`
- 传递 `{ status: 'published', limit: 3, orderBy: 'updatedAtDesc' }`
- 将结果通过 props 传递给 `FrontHome` 组件
- 保持现有的 `SpotlightCard` 视觉效果

### 3. 上传功能实现

#### 3.1 API 端点设计

**新建文件**：`app/api/upload/route.ts`

```typescript
export async function POST(request: Request) {
  // 1. 验证用户权限（requireAdminUser）
  // 2. 解析 multipart/form-data
  // 3. 验证存储源 ID
  // 4. 根据存储类型保存文件
  // 5. 创建 files 记录
  // 6. 触发元数据提取（异步）
  // 7. 返回上传结果
}
```

**请求格式**：
```typescript
FormData {
  storageId: string;
  files: File[];
}
```

**响应格式**：
```typescript
{
  success: boolean;
  uploadedFiles: Array<{
    id: number;
    filename: string;
    size: number;
  }>;
  errors?: Array<{
    filename: string;
    error: string;
  }>;
}
```

#### 3.2 上传中心组件修改

**文件位置**：`app/ui/admin/upload-center.tsx`

需要修改的部分：

```typescript
// 当前使用 FileReader 模拟上传
const startUpload = useCallback((item: UploadItem) => {
  // 模拟进度
  reader.onprogress = ...
}, []);

// 修改为：真实上传到服务器
const startUpload = useCallback(async (item: UploadItem) => {
  const formData = new FormData();
  formData.append('storageId', selectedStorageId.toString());
  formData.append('file', item.file);
  
  // 使用 XMLHttpRequest 或 fetch 上传
  // 监听上传进度
  // 更新 UI 状态
}, [selectedStorageId]);
```

#### 3.3 元数据提取模块

**文件位置**：`app/lib/metadata-extractor.ts` (新建)

```typescript
export async function extractPhotoMetadata(
  filePath: string,
  fileId: number
): Promise<void> {
  // 1. 使用 Sharp 生成缩略图
  // 2. 使用 Sharp 生成 BlurHash
  // 3. 使用 Exifr 提取 EXIF 信息
  // 4. 更新 photo_metadata 表
}

export async function extractVideoMetadata(
  filePath: string,
  fileId: number
): Promise<void> {
  // 1. 使用 FFmpeg 提取视频信息
  // 2. 生成视频缩略图（poster frame）
  // 3. 生成 BlurHash
  // 4. 更新 video_metadata 表
}
```

### 4. 批量删除功能

#### 4.1 Server Action

**文件位置**：`app/lib/actions.ts` (新增函数)

```typescript
export async function deleteMediaFiles(fileIds: number[]) {
  const t = await getTranslations('actions.files');
  const user = await requireAdminUser();
  
  // 验证文件所有权
  // 开启事务
  await db.transaction(async (tx) => {
    // 1. 删除 collection_media 关联
    // 2. 删除 photo_metadata
    // 3. 删除 video_metadata
    // 4. 删除 files 记录
    // 5. 清理 hero_images 引用
    // 6. 清理 collection coverImages 引用
    // 7. 删除物理文件
  });
  
  // 重新验证页面
  revalidatePathForAllLocales('/dashboard/media');
  revalidatePathForAllLocales('/gallery');
  
  return { success: true, message: t('deleted') };
}
```

#### 4.2 媒体库组件修改

**文件位置**：`app/ui/admin/media/media-library.tsx`

需要添加的功能：

```typescript
// 1. 添加批量选择状态
const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

// 2. 添加批量操作工具栏
{selectedIds.size > 0 && (
  <div className="batch-toolbar">
    <Button onClick={handleBatchDelete}>
      删除 ({selectedIds.size})
    </Button>
    <Button onClick={handleBatchDownload}>
      下载 ({selectedIds.size})
    </Button>
  </div>
)}

// 3. 添加确认对话框
const handleBatchDelete = () => {
  // 显示确认对话框
  // 确认后调用 deleteMediaFiles(Array.from(selectedIds))
};
```


### 5. 批量下载功能

#### 5.1 API 端点设计

**新建文件**：`app/api/download/route.ts`

```typescript
export async function POST(request: Request) {
  // 1. 验证用户权限
  // 2. 解析文件 ID 列表
  // 3. 查询文件信息
  // 4. 如果单文件，直接返回文件流
  // 5. 如果多文件，生成 ZIP 并返回
  // 6. 记录临时文件路径用于后续清理
}
```

**请求格式**：
```typescript
{
  fileIds: number[];
}
```

**响应**：
- 单文件：直接返回文件流（Content-Disposition: attachment）
- 多文件：返回 ZIP 文件流

#### 5.2 ZIP 生成模块

**文件位置**：`app/lib/zip-generator.ts` (新建)

```typescript
import archiver from 'archiver';

export async function createZipFromFiles(
  files: Array<{ path: string; name: string }>,
  outputPath: string
): Promise<void> {
  // 使用 archiver 创建 ZIP
  // 添加所有文件
  // 返回 ZIP 路径
}

export async function cleanupTempFiles(olderThan: Date): Promise<void> {
  // 清理超过指定时间的临时 ZIP 文件
  // 可以通过 cron job 或在每次下载时触发
}
```

#### 5.3 客户端下载逻辑

**文件位置**：`app/ui/admin/media/media-library.tsx`

```typescript
const handleBatchDownload = async () => {
  setDownloading(true);
  try {
    const response = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileIds: Array.from(selectedIds) }),
    });
    
    if (!response.ok) throw new Error('Download failed');
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `media-${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    toast.error('下载失败');
  } finally {
    setDownloading(false);
  }
};
```

### 6. 实况照片播放

#### 6.1 实况照片检测

**数据库字段**：`photo_metadata.liveType`
- `none`: 普通照片
- `embedded`: 内嵌视频（MOV 文件中包含视频流）
- `paired`: 配对视频（单独的视频文件）

#### 6.2 前台媒体卡片组件

**文件位置**：`app/ui/front/media-card.tsx` (新建或修改现有)

```typescript
export function MediaCard({ item }: { item: GalleryItem }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const isLivePhoto = item.liveType && item.liveType !== 'none';
  
  const handleMouseEnter = () => {
    if (isLivePhoto && videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };
  
  const handleMouseLeave = () => {
    if (isLivePhoto && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };
  
  return (
    <div 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 静态图片 */}
      <img src={item.thumbUrl} alt={item.title} />
      
      {/* 实况照片图标 */}
      {isLivePhoto && (
        <div className="absolute top-2 right-2">
          <LivePhotoIcon />
        </div>
      )}
      
      {/* 视频层（hover 时播放） */}
      {isLivePhoto && (
        <video
          ref={videoRef}
          src={getVideoUrl(item)}
          className={cn(
            "absolute inset-0 w-full h-full object-cover",
            isPlaying ? "opacity-100" : "opacity-0"
          )}
          loop
          muted
          playsInline
          preload="auto"
        />
      )}
    </div>
  );
}
```

#### 6.3 移动端适配

```typescript
// 检测触摸设备
const isTouchDevice = 'ontouchstart' in window;

// 移动端使用点击切换
const handleClick = () => {
  if (isTouchDevice && isLivePhoto) {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      videoRef.current?.play();
    } else {
      videoRef.current?.pause();
    }
  }
};
```

### 7. UI/UX 优化

#### 7.1 媒体详情模态框

**新建文件**：`app/ui/front/media-detail-modal.tsx`

```typescript
export function MediaDetailModal({ 
  item, 
  isOpen, 
  onClose,
  onPrevious,
  onNext 
}: MediaDetailModalProps) {
  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrevious();
      if (e.key === 'ArrowRight') onNext();
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose, onPrevious, onNext]);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh]">
        {/* 大尺寸预览图 */}
        <div className="flex-1 relative">
          {item.mediaType === 'video' ? (
            <video src={item.url} controls className="w-full h-full object-contain" />
          ) : (
            <img src={item.url} alt={item.title} className="w-full h-full object-contain" />
          )}
        </div>
        
        {/* EXIF 信息面板 */}
        <div className="w-80 overflow-y-auto">
          <ExifInfoPanel item={item} />
        </div>
        
        {/* 导航按钮 */}
        <Button onClick={onPrevious} className="absolute left-4 top-1/2">
          <ChevronLeft />
        </Button>
        <Button onClick={onNext} className="absolute right-4 top-1/2">
          <ChevronRight />
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

#### 7.2 EXIF 信息面板

```typescript
function ExifInfoPanel({ item }: { item: GalleryItem }) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">{item.title}</h3>
      
      {/* 基础信息 */}
      <Section title="基础信息">
        <InfoRow label="拍摄时间" value={formatDate(item.dateShot)} />
        <InfoRow label="文件大小" value={formatBytes(item.size)} />
        <InfoRow label="分辨率" value={`${item.width} × ${item.height}`} />
      </Section>
      
      {/* 相机参数 */}
      {item.camera && (
        <Section title="相机参数">
          <InfoRow label="相机" value={item.camera} />
          <InfoRow label="镜头" value={item.lens} />
          <InfoRow label="光圈" value={`f/${item.aperture}`} />
          <InfoRow label="快门" value={formatShutter(item.exposure)} />
          <InfoRow label="ISO" value={item.iso} />
          <InfoRow label="焦距" value={`${item.focalLength}mm`} />
        </Section>
      )}
      
      {/* GPS 位置 */}
      {item.gpsLatitude && item.gpsLongitude && (
        <Section title="位置信息">
          <InfoRow label="地点" value={item.locationName} />
          <InfoRow label="坐标" value={`${item.gpsLatitude}, ${item.gpsLongitude}`} />
          <Button variant="link" onClick={() => openMap(item)}>
            在地图中查看
          </Button>
        </Section>
      )}
    </div>
  );
}
```


#### 7.3 筛选器优化

**文件位置**：`app/ui/admin/media/media-filter-bar.tsx` (修改现有)

```typescript
export function MediaFilterBar({ 
  filters, 
  onFiltersChange 
}: MediaFilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // 计算激活的筛选条件数量
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.storageIds?.length) count++;
    if (filters.mediaType !== 'all') count++;
    if (filters.publishStatus !== 'all') count++;
    if (filters.keyword) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    // ... 其他高级筛选
    return count;
  }, [filters]);
  
  return (
    <div className="space-y-4">
      {/* 基础筛选 */}
      <div className="flex flex-wrap gap-3">
        <Select 
          value={filters.storageIds?.[0]?.toString() || 'all'}
          onValueChange={(value) => handleStorageChange(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="存储源" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部存储源</SelectItem>
            {storages.map(s => (
              <SelectItem key={s.id} value={s.id.toString()}>
                {s.alias || s.type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select 
          value={filters.mediaType || 'all'}
          onValueChange={(value) => onFiltersChange({ ...filters, mediaType: value })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="媒体类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="image">照片</SelectItem>
            <SelectItem value="video">视频</SelectItem>
            <SelectItem value="animated">动图</SelectItem>
          </SelectContent>
        </Select>
        
        <Select 
          value={filters.publishStatus || 'all'}
          onValueChange={(value) => onFiltersChange({ ...filters, publishStatus: value })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="发布状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="published">已发布</SelectItem>
            <SelectItem value="unpublished">未发布</SelectItem>
          </SelectContent>
        </Select>
        
        <Input
          placeholder="搜索标题或路径..."
          value={filters.keyword || ''}
          onChange={(e) => onFiltersChange({ ...filters, keyword: e.target.value })}
          className="w-[240px]"
        />
        
        <Button 
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          高级筛选 {activeFilterCount > 0 && `(${activeFilterCount})`}
          <ChevronDown className={cn(
            "ml-2 h-4 w-4 transition-transform",
            showAdvanced && "rotate-180"
          )} />
        </Button>
        
        {activeFilterCount > 0 && (
          <Button 
            variant="ghost"
            onClick={() => onFiltersChange({})}
          >
            清除筛选
          </Button>
        )}
      </div>
      
      {/* 高级筛选（可折叠） */}
      {showAdvanced && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 border rounded-lg">
          {/* 日期范围 */}
          <div className="space-y-2">
            <Label>拍摄日期</Label>
            <div className="flex gap-2">
              <Input 
                type="date" 
                value={filters.dateFrom || ''}
                onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
              />
              <Input 
                type="date" 
                value={filters.dateTo || ''}
                onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
              />
            </div>
          </div>
          
          {/* 文件大小 */}
          <div className="space-y-2">
            <Label>文件大小 (MB)</Label>
            <div className="flex gap-2">
              <Input 
                type="number" 
                placeholder="最小"
                value={filters.sizeMin ? filters.sizeMin / 1024 / 1024 : ''}
                onChange={(e) => onFiltersChange({ 
                  ...filters, 
                  sizeMin: e.target.value ? Number(e.target.value) * 1024 * 1024 : undefined 
                })}
              />
              <Input 
                type="number" 
                placeholder="最大"
                value={filters.sizeMax ? filters.sizeMax / 1024 / 1024 : ''}
                onChange={(e) => onFiltersChange({ 
                  ...filters, 
                  sizeMax: e.target.value ? Number(e.target.value) * 1024 * 1024 : undefined 
                })}
              />
            </div>
          </div>
          
          {/* 分辨率 */}
          <div className="space-y-2">
            <Label>宽度 (px)</Label>
            <div className="flex gap-2">
              <Input 
                type="number" 
                placeholder="最小"
                value={filters.widthMin || ''}
                onChange={(e) => onFiltersChange({ 
                  ...filters, 
                  widthMin: e.target.value ? Number(e.target.value) : undefined 
                })}
              />
              <Input 
                type="number" 
                placeholder="最大"
                value={filters.widthMax || ''}
                onChange={(e) => onFiltersChange({ 
                  ...filters, 
                  widthMax: e.target.value ? Number(e.target.value) : undefined 
                })}
              />
            </div>
          </div>
          
          {/* 相机参数 */}
          <div className="space-y-2">
            <Label>光圈</Label>
            <div className="flex gap-2">
              <Input 
                type="number" 
                step="0.1"
                placeholder="最小"
                value={filters.apertureMin || ''}
                onChange={(e) => onFiltersChange({ 
                  ...filters, 
                  apertureMin: e.target.value ? Number(e.target.value) : undefined 
                })}
              />
              <Input 
                type="number" 
                step="0.1"
                placeholder="最大"
                value={filters.apertureMax || ''}
                onChange={(e) => onFiltersChange({ 
                  ...filters, 
                  apertureMax: e.target.value ? Number(e.target.value) : undefined 
                })}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>ISO</Label>
            <div className="flex gap-2">
              <Input 
                type="number" 
                placeholder="最小"
                value={filters.isoMin || ''}
                onChange={(e) => onFiltersChange({ 
                  ...filters, 
                  isoMin: e.target.value ? Number(e.target.value) : undefined 
                })}
              />
              <Input 
                type="number" 
                placeholder="最大"
                value={filters.isoMax || ''}
                onChange={(e) => onFiltersChange({ 
                  ...filters, 
                  isoMax: e.target.value ? Number(e.target.value) : undefined 
                })}
              />
            </div>
          </div>
          
          {/* 方向 */}
          <div className="space-y-2">
            <Label>方向</Label>
            <Select 
              value={filters.orientation || 'all'}
              onValueChange={(value) => onFiltersChange({ ...filters, orientation: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="landscape">横向</SelectItem>
                <SelectItem value="portrait">纵向</SelectItem>
                <SelectItem value="square">正方形</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* 设备 */}
          <div className="space-y-2">
            <Label>相机</Label>
            <Input 
              placeholder="相机型号"
              value={filters.camera || ''}
              onChange={(e) => onFiltersChange({ ...filters, camera: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label>镜头</Label>
            <Input 
              placeholder="镜头型号"
              value={filters.lens || ''}
              onChange={(e) => onFiltersChange({ ...filters, lens: e.target.value })}
            />
          </div>
          
          {/* GPS */}
          <div className="space-y-2">
            <Label>GPS 信息</Label>
            <Select 
              value={filters.hasGps || 'all'}
              onValueChange={(value) => onFiltersChange({ ...filters, hasGps: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="yes">有位置</SelectItem>
                <SelectItem value="no">无位置</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
```


#### 7.4 前台画廊筛选和排序

**文件位置**：`app/ui/front/gallery-filter.tsx` (新建)

```typescript
export function GalleryFilter({ 
  mediaType, 
  sortOrder,
  onMediaTypeChange,
  onSortOrderChange 
}: GalleryFilterProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      {/* 媒体类型筛选 */}
      <Tabs value={mediaType} onValueChange={onMediaTypeChange}>
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="image">照片</TabsTrigger>
          <TabsTrigger value="video">视频</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* 排序选项 */}
      <Select value={sortOrder} onValueChange={onSortOrderChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">最新优先</SelectItem>
          <SelectItem value="oldest">最旧优先</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
```

**集成到画廊页面**：

```typescript
// app/[locale]/(front)/gallery/page.tsx
export default function GalleryPage() {
  const [mediaType, setMediaType] = useState<'all' | 'image' | 'video'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  
  // 当筛选条件变化时，重新加载数据
  const handleMediaTypeChange = (value: string) => {
    setMediaType(value as any);
    // 重置无限滚动状态
    // 重新加载数据
  };
  
  return (
    <div>
      <GalleryFilter 
        mediaType={mediaType}
        sortOrder={sortOrder}
        onMediaTypeChange={handleMediaTypeChange}
        onSortOrderChange={setSortOrder}
      />
      <GalleryInfinite 
        mediaType={mediaType}
        sortOrder={sortOrder}
      />
    </div>
  );
}
```

### 8. 数据一致性修复

#### 8.1 级联删除函数

**文件位置**：`app/lib/actions.ts` (修改现有的 deleteUserStorage)

```typescript
export async function deleteUserStorage(storageId: number) {
  const t = await getTranslations('actions.storage');
  const user = await requireAdminUser();
  
  const storage = await db.query.userStorages.findFirst({
    where: and(eq(userStorages.id, storageId), eq(userStorages.userId, user.id)),
  });

  if (!storage) {
    return { success: false, message: t('notFound') };
  }

  await db.transaction(async (tx) => {
    // 1. 获取该存储源下的所有文件 ID
    const fileList = await tx
      .select({ id: files.id })
      .from(files)
      .where(eq(files.userStorageId, storageId));

    const fileIds = fileList.map((f) => f.id);

    if (fileIds.length > 0) {
      // 2. 删除集合关联
      await tx
        .delete(collectionMedia)
        .where(inArray(collectionMedia.fileId, fileIds));
      
      // 3. 删除元数据
      await tx
        .delete(photoMetadata)
        .where(inArray(photoMetadata.fileId, fileIds));
      
      await tx
        .delete(videoMetadata)
        .where(inArray(videoMetadata.fileId, fileIds));
      
      // 4. 清理 Hero 照片引用
      await cleanHeroReferences(tx, fileIds, user.id);
      
      // 5. 清理集合封面引用
      await cleanCollectionCoverReferences(tx, fileIds);
      
      // 6. 删除文件记录
      await tx.delete(files).where(eq(files.userStorageId, storageId));
    }

    // 7. 删除存储源配置
    await tx
      .delete(userStorages)
      .where(and(eq(userStorages.id, storageId), eq(userStorages.userId, user.id)));
  });

  // 8. 重新验证页面
  revalidatePathForAllLocales('/dashboard/storage');
  revalidatePathForAllLocales('/dashboard/media');
  revalidatePathForAllLocales('/gallery');
  
  return { success: true, message: t('deleted') };
}
```

#### 8.2 Hero 引用清理函数

```typescript
async function cleanHeroReferences(
  tx: any, 
  deletedFileIds: number[], 
  userId: number
) {
  const HERO_SETTING_KEY = 'hero_images';
  
  // 读取当前 Hero 设置
  const existing = await tx
    .select({ id: userSettings.id, value: userSettings.value })
    .from(userSettings)
    .where(and(
      eq(userSettings.userId, userId), 
      eq(userSettings.key, HERO_SETTING_KEY)
    ))
    .limit(1);
  
  if (!existing[0]) return;
  
  const currentIds = normalizeIdList(existing[0].value);
  const updatedIds = currentIds.filter(id => !deletedFileIds.includes(id));
  
  if (updatedIds.length === 0) {
    // 如果没有剩余的 Hero 照片，删除设置
    await tx
      .delete(userSettings)
      .where(eq(userSettings.id, existing[0].id));
  } else if (updatedIds.length !== currentIds.length) {
    // 如果有变化，更新设置
    await tx
      .update(userSettings)
      .set({ value: updatedIds, updatedAt: new Date() })
      .where(eq(userSettings.id, existing[0].id));
  }
}
```

#### 8.3 集合封面引用清理函数

```typescript
async function cleanCollectionCoverReferences(
  tx: any, 
  deletedFileIds: number[]
) {
  // 查询所有包含已删除文件作为封面的集合
  const affectedCollections = await tx
    .select({ 
      id: collections.id, 
      coverImages: collections.coverImages 
    })
    .from(collections)
    .where(sql`${collections.coverImages} && ARRAY[${deletedFileIds.join(',')}]::integer[]`);
  
  // 更新每个受影响的集合
  for (const collection of affectedCollections) {
    const currentCovers = Array.isArray(collection.coverImages) 
      ? collection.coverImages 
      : [];
    
    const updatedCovers = currentCovers.filter(
      id => !deletedFileIds.includes(id)
    );
    
    await tx
      .update(collections)
      .set({ 
        coverImages: updatedCovers.length > 0 ? updatedCovers : null,
        updatedAt: new Date() 
      })
      .where(eq(collections.id, collection.id));
  }
}
```

#### 8.4 批量删除文件函数

```typescript
export async function deleteMediaFiles(fileIds: number[]) {
  const t = await getTranslations('actions.files');
  const user = await requireAdminUser();
  
  if (!fileIds.length) {
    return { success: false, message: t('noneSelected') };
  }
  
  // 验证文件所有权
  const storageIds = await db
    .select({ id: userStorages.id })
    .from(userStorages)
    .where(eq(userStorages.userId, user.id));
  
  const allowedStorageIds = storageIds.map(s => s.id);
  
  const filesToDelete = await db
    .select({ 
      id: files.id, 
      path: files.path,
      userStorageId: files.userStorageId 
    })
    .from(files)
    .where(
      and(
        inArray(files.id, fileIds),
        inArray(files.userStorageId, allowedStorageIds)
      )
    );
  
  if (filesToDelete.length === 0) {
    return { success: false, message: t('noPermission') };
  }
  
  const validFileIds = filesToDelete.map(f => f.id);
  
  await db.transaction(async (tx) => {
    // 1. 删除集合关联
    await tx
      .delete(collectionMedia)
      .where(inArray(collectionMedia.fileId, validFileIds));
    
    // 2. 删除元数据
    await tx
      .delete(photoMetadata)
      .where(inArray(photoMetadata.fileId, validFileIds));
    
    await tx
      .delete(videoMetadata)
      .where(inArray(videoMetadata.fileId, validFileIds));
    
    // 3. 清理 Hero 引用
    await cleanHeroReferences(tx, validFileIds, user.id);
    
    // 4. 清理集合封面引用
    await cleanCollectionCoverReferences(tx, validFileIds);
    
    // 5. 删除文件记录
    await tx
      .delete(files)
      .where(inArray(files.id, validFileIds));
  });
  
  // 6. 删除物理文件（在事务外执行，避免阻塞）
  for (const file of filesToDelete) {
    try {
      await deletePhysicalFile(file.userStorageId, file.path);
    } catch (error) {
      console.error(`Failed to delete physical file: ${file.path}`, error);
      // 继续删除其他文件，不中断流程
    }
  }
  
  // 7. 重新验证页面
  revalidatePathForAllLocales('/dashboard/media');
  revalidatePathForAllLocales('/gallery');
  revalidatePathForAllLocales('/');
  
  return { 
    success: true, 
    message: t('deleted', { count: validFileIds.length }) 
  };
}
```


## Data Models

### 现有数据模型

项目已有完整的数据库 schema（`app/lib/schema.ts`），本次功能完善不需要修改数据模型。

关键表结构：

#### files 表
```typescript
{
  id: serial (主键)
  title: varchar(255)
  path: text (相对路径)
  sourceType: varchar(50) // 's3' | 'qiniu' | 'local' | 'nas'
  size: bigint
  mimeType: varchar(100)
  url: text (原图 URL)
  thumbUrl: text (缩略图 URL)
  userStorageId: integer (关联 user_storages)
  mediaType: varchar(50) // 'image' | 'video' | 'animated'
  blurHash: varchar(64)
  isPublished: boolean
  author: varchar(255)
  createdAt: timestamp
  updatedAt: timestamp
  deletedAt: timestamp (软删除)
}
```

#### photo_metadata 表
```typescript
{
  fileId: integer (主键，关联 files.id)
  description: text
  camera: varchar(255)
  maker: varchar(255)
  lens: varchar(255)
  dateShot: timestamp
  exposure: double
  aperture: double
  iso: bigint
  focalLength: double
  liveType: varchar(20) // 'none' | 'embedded' | 'paired'
  videoOffset: integer (内嵌视频偏移量)
  pairedPath: text (配对视频路径)
  videoDuration: double
  gpsLatitude: double
  gpsLongitude: double
  locationName: varchar(255)
  resolutionWidth: integer
  resolutionHeight: integer
  // ... 其他 EXIF 字段
}
```

#### collections 表
```typescript
{
  id: serial (主键)
  title: varchar(255)
  description: text
  author: varchar(255)
  coverImages: integer[] (封面图片 ID 数组，最多 3 张)
  type: varchar(16) // 'mixed' | 'photo' | 'video'
  status: varchar(16) // 'draft' | 'published'
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### user_settings 表
```typescript
{
  id: serial (主键)
  userId: integer
  key: varchar(100) // 'hero_images' | 'system_settings_zh-CN' | ...
  value: jsonb // 存储配置数据
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Hero 照片配置格式

存储在 `user_settings` 表中，key 为 `'hero_images'`：

```typescript
{
  userId: number;
  key: 'hero_images';
  value: number[]; // 文件 ID 数组
}
```

### 系统设置配置格式

存储在 `user_settings` 表中，key 为 `'system_settings_{locale}'`：

```typescript
{
  userId: number;
  key: 'system_settings_zh-CN' | 'system_settings_en';
  value: {
    siteName?: string;
    seoDescription?: string;
    publicAccess?: boolean;
    about?: {
      avatar?: string;
      name?: string;
      location?: string;
      bio?: string;
      commonEquipment?: string;
      contacts?: Array<{
        id: string;
        type: string;
        label: string;
        value: string;
      }>;
    };
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Hero 照片数据获取正确性

*For any* Frontend_Home 组件加载，调用 `fetchHeroPhotosForHome()` 应该返回已发布且存储源未禁用的照片列表，且列表中的照片 ID 应该与 `user_settings.hero_images` 配置一致。

**Validates: Requirements 1.1, 1.2**

### Property 2: Hero 照片降级方案

*For any* 情况下，如果 `fetchHeroPhotosForHome()` 返回空数组，前台应该显示预设的默认图片，确保用户始终能看到 Hero 区域的内容。

**Validates: Requirements 1.3**

### Property 3: 轮播状态一致性

*For any* Hero 照片数组，轮播的当前索引应该始终在有效范围内（0 到 length-1），且自动切换和手动切换应该正确更新索引。

**Validates: Requirements 1.4**

### Property 4: 色调检测幂等性

*For any* 给定的图片和文本区域位置，色调检测函数应该返回一致的结果（light 或 dark），多次调用应该产生相同的输出。

**Validates: Requirements 1.5**

### Property 5: 数据更新后的缓存失效

*For any* Hero 照片数据更新操作，系统应该重新验证前台页面，确保用户在下次访问时看到最新的照片。

**Validates: Requirements 1.6**

### Property 6: 精选集合筛选正确性

*For any* 数据库中的集合，`fetchCollections({ status: 'published' })` 应该只返回状态为 `published` 的集合，不包含 `draft` 状态的集合。

**Validates: Requirements 2.1**

### Property 7: 精选集合数量限制

*For any* 数据库中的集合数量，首页显示的精选集合应该最多为 3 个，即使数据库中有更多已发布的集合。

**Validates: Requirements 2.2**

### Property 8: 集合信息完整性

*For any* 返回的集合对象，应该包含 `title`、`description`、`type`、`itemCount` 和 `covers` 字段，且 `covers` 数组应该包含有效的封面图信息。

**Validates: Requirements 2.3**

### Property 9: 集合默认封面生成

*For any* 未设置封面的集合，系统应该自动使用该集合中前 3 个媒体项作为默认封面，确保每个集合都有可显示的封面。

**Validates: Requirements 2.4**

### Property 10: 集合导航正确性

*For any* 集合卡片，点击后应该导航到 `/collections/[id]` 路径，其中 `[id]` 为该集合的实际 ID。

**Validates: Requirements 2.6**

### Property 11: 上传权限验证

*For any* 用户，只有具有管理员权限的用户才能成功调用上传 API，非管理员用户应该收到权限错误。

**Validates: Requirements 3.2**

### Property 12: 存储源有效性验证

*For any* 上传请求，目标存储源必须存在且未被禁用，否则上传应该失败并返回明确的错误信息。

**Validates: Requirements 3.3**

### Property 13: 文件保存位置正确性

*For any* 上传的文件和存储源类型（local/nas/s3），文件应该保存到该存储源配置的正确位置。

**Validates: Requirements 3.4**

### Property 14: 上传后数据库记录创建

*For any* 成功上传的文件，`files` 表中应该存在对应的记录，且记录包含正确的文件路径、大小、MIME 类型等信息。

**Validates: Requirements 3.5**

### Property 15: 元数据提取完整性

*For any* 上传的图片文件，系统应该生成缩略图、BlurHash 和 EXIF 元数据，并存储在 `photo_metadata` 表中。

**Validates: Requirements 3.6**

### Property 16: 上传进度单调递增

*For any* 上传过程，进度值应该从 0 开始单调递增到 100，不应该出现进度倒退的情况。

**Validates: Requirements 3.7**

### Property 17: 并发上传独立性

*For any* 同时上传的多个文件，每个文件的上传进度和状态应该独立管理，一个文件的失败不应该影响其他文件。

**Validates: Requirements 3.10**

### Property 18: 批量选择状态一致性

*For any* 媒体库中的选中状态，选中项数量应该等于 `selectedIds` Set 的大小，且工具栏的显示应该与选中数量一致。

**Validates: Requirements 4.2**

### Property 19: 删除确认对话框数量显示

*For any* 选中的文件数量，确认对话框应该显示正确的数量，且该数量应该等于 `selectedIds.size`。

**Validates: Requirements 4.4**

### Property 20: 删除权限验证

*For any* 用户，只有具有管理员权限的用户才能成功执行批量删除操作，非管理员用户应该收到权限错误。

**Validates: Requirements 4.6**

### Property 21: 级联删除完整性

*For any* 被删除的文件 ID 列表，系统应该从 `collection_media`、`photo_metadata`、`video_metadata` 和 `files` 表中删除所有相关记录。

**Validates: Requirements 4.7**

### Property 22: 物理文件删除一致性

*For any* 被删除的文件记录，对应的物理文件应该从存储中删除（本地/NAS）或标记删除（S3）。

**Validates: Requirements 4.8**

### Property 23: Hero 引用清理正确性

*For any* 被删除的文件 ID，该 ID 不应该出现在任何用户的 `hero_images` 配置中。

**Validates: Requirements 4.9, 8.1**

### Property 24: 集合封面引用清理正确性

*For any* 被删除的文件 ID，该 ID 不应该出现在任何集合的 `coverImages` 数组中。

**Validates: Requirements 4.10, 8.2**

### Property 25: ZIP 内容完整性

*For any* 选中的文件 ID 列表，生成的 ZIP 文件应该包含所有选中文件的原始文件，且文件数量应该等于选中数量。

**Validates: Requirements 5.6**

### Property 26: ZIP 文件命名合理性

*For any* ZIP 中的文件，文件名应该保留原始文件名或使用媒体标题，确保文件名有意义且不冲突。

**Validates: Requirements 5.7**

### Property 27: 临时文件清理及时性

*For any* 生成的临时 ZIP 文件，应该在 24 小时后或下载完成后被清理，避免磁盘空间浪费。

**Validates: Requirements 5.9**

### Property 28: 实况照片图标显示条件

*For any* 媒体项，当且仅当 `liveType` 字段不为 `none` 时，应该显示实况照片标识图标。

**Validates: Requirements 6.1**

### Property 29: 实况照片 Hover 播放行为

*For any* 实况照片，当鼠标悬停时应该自动播放配对的视频，鼠标移开时应该停止播放并恢复静态图片。

**Validates: Requirements 6.3, 6.5**

### Property 30: 实况照片视频循环播放

*For any* 实况照片的视频播放，应该设置为循环播放且静音，确保用户体验流畅。

**Validates: Requirements 6.4**

### Property 31: 实况照片视频预加载

*For any* 实况照片，视频部分应该被预加载（preload="auto"），确保 Hover 时能立即播放。

**Validates: Requirements 6.6**

### Property 32: 移动端交互方式适配

*For any* 触摸设备，实况照片应该使用点击切换播放，而不是 Hover 触发，确保移动端可用性。

**Validates: Requirements 6.8**

### Property 33: 详情模态框 EXIF 信息完整性

*For any* 包含 EXIF 信息的照片，详情模态框应该显示所有可用的 EXIF 字段（相机、镜头、光圈、快门、ISO、焦距、拍摄时间、GPS 位置）。

**Validates: Requirements 7.3**

### Property 34: 详情模态框键盘导航

*For any* 打开的详情模态框，按下左右箭头键应该切换到上一张/下一张媒体，且切换后的索引应该在有效范围内。

**Validates: Requirements 7.5**

### Property 35: 筛选条件计数正确性

*For any* 激活的筛选条件组合，筛选器应该显示正确的激活条件数量，且该数量应该等于非默认值的筛选项数量。

**Validates: Requirements 7.12**

### Property 36: 画廊筛选后数据重新加载

*For any* 筛选或排序条件的变化，画廊应该重新加载数据并保持无限滚动功能，且新数据应该符合新的筛选条件。

**Validates: Requirements 7.17**

### Property 37: 存储源级联删除完整性

*For any* 被删除的存储源，该存储源下的所有文件记录、元数据记录、集合关联、Hero 引用和集合封面引用都应该被清理。

**Validates: Requirements 8.3, 8.4, 8.5, 8.6, 8.7, 8.8**

### Property 38: 删除操作事务完整性

*For any* 删除操作（文件或存储源），所有数据库操作应该在一个事务中执行，要么全部成功要么全部回滚。

**Validates: Requirements 8.9**


## Error Handling

### 错误分类

#### 1. 客户端错误（4xx）

**权限错误（403 Forbidden）**
- 场景：非管理员用户尝试上传、删除文件
- 处理：返回明确的权限错误信息，前端显示 toast 提示
- 示例：`{ success: false, message: '权限不足，仅管理员可执行此操作' }`

**资源不存在（404 Not Found）**
- 场景：请求不存在的文件、存储源或集合
- 处理：返回资源不存在错误，前端显示友好提示
- 示例：`{ success: false, message: '存储源不存在' }`

**请求参数错误（400 Bad Request）**
- 场景：上传文件格式不支持、文件大小超限、必填参数缺失
- 处理：使用 Zod 验证请求参数，返回详细的验证错误
- 示例：`{ success: false, errors: { storageId: ['存储源 ID 必须为正整数'] } }`

#### 2. 服务端错误（5xx）

**数据库错误**
- 场景：数据库连接失败、查询超时、事务冲突
- 处理：捕获数据库异常，记录详细日志，返回通用错误信息
- 回滚：使用事务确保数据一致性，失败时自动回滚
- 示例：`{ success: false, message: '操作失败，请稍后重试' }`

**文件系统错误**
- 场景：磁盘空间不足、文件权限不足、路径不存在
- 处理：捕获文件系统异常，记录日志，返回具体错误
- 示例：`{ success: false, message: '磁盘空间不足，无法保存文件' }`

**外部服务错误**
- 场景：S3 连接失败、FFmpeg 处理超时、Sharp 内存溢出
- 处理：设置超时时间，捕获异常，提供降级方案
- 示例：S3 上传失败时，提示用户检查网络或稍后重试

#### 3. 业务逻辑错误

**数据一致性错误**
- 场景：删除正在被使用的文件、存储源配置冲突
- 处理：在操作前检查依赖关系，提供明确的错误提示
- 示例：`{ success: false, message: '该文件正在被 3 个集合使用，无法删除' }`

**并发冲突错误**
- 场景：多个用户同时修改同一资源
- 处理：使用乐观锁或悲观锁，检测冲突并提示用户
- 示例：`{ success: false, message: '数据已被其他用户修改，请刷新后重试' }`

### 错误处理策略

#### 上传错误处理

```typescript
// app/api/upload/route.ts
export async function POST(request: Request) {
  try {
    // 1. 验证用户权限
    const user = await requireAdminUser();
  } catch (error) {
    return NextResponse.json(
      { success: false, message: '权限不足' },
      { status: 403 }
    );
  }
  
  try {
    // 2. 解析和验证请求
    const formData = await request.formData();
    const storageId = Number(formData.get('storageId'));
    
    if (!storageId || storageId <= 0) {
      return NextResponse.json(
        { success: false, message: '无效的存储源 ID' },
        { status: 400 }
      );
    }
    
    // 3. 验证存储源
    const storage = await db.query.userStorages.findFirst({
      where: eq(userStorages.id, storageId),
    });
    
    if (!storage) {
      return NextResponse.json(
        { success: false, message: '存储源不存在' },
        { status: 404 }
      );
    }
    
    const config = storage.config as { isDisabled?: boolean };
    if (config.isDisabled) {
      return NextResponse.json(
        { success: false, message: '存储源已被禁用' },
        { status: 400 }
      );
    }
    
    // 4. 处理文件上传
    const files = formData.getAll('files') as File[];
    const results = [];
    const errors = [];
    
    for (const file of files) {
      try {
        // 验证文件大小（例如：最大 100MB）
        if (file.size > 100 * 1024 * 1024) {
          errors.push({
            filename: file.name,
            error: '文件大小超过 100MB 限制',
          });
          continue;
        }
        
        // 验证文件类型
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
        if (!allowedTypes.includes(file.type)) {
          errors.push({
            filename: file.name,
            error: '不支持的文件类型',
          });
          continue;
        }
        
        // 保存文件
        const savedFile = await saveFileToStorage(storage, file);
        
        // 创建数据库记录
        const fileRecord = await db.insert(files).values({
          title: file.name,
          path: savedFile.path,
          size: file.size,
          mimeType: file.type,
          userStorageId: storageId,
          mediaType: file.type.startsWith('image/') ? 'image' : 'video',
          isPublished: false,
        }).returning();
        
        // 异步提取元数据（不阻塞响应）
        extractMetadataAsync(fileRecord[0].id, savedFile.fullPath);
        
        results.push({
          id: fileRecord[0].id,
          filename: file.name,
          size: file.size,
        });
      } catch (error) {
        console.error(`Failed to upload file ${file.name}:`, error);
        errors.push({
          filename: file.name,
          error: error instanceof Error ? error.message : '上传失败',
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      uploadedFiles: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Upload failed:', error);
    return NextResponse.json(
      { success: false, message: '上传失败，请稍后重试' },
      { status: 500 }
    );
  }
}
```

#### 删除错误处理

```typescript
// app/lib/actions.ts
export async function deleteMediaFiles(fileIds: number[]) {
  const t = await getTranslations('actions.files');
  
  try {
    const user = await requireAdminUser();
  } catch (error) {
    return { success: false, message: t('permissionDenied') };
  }
  
  if (!fileIds.length) {
    return { success: false, message: t('noneSelected') };
  }
  
  try {
    // 验证文件所有权
    const storageIds = await db
      .select({ id: userStorages.id })
      .from(userStorages)
      .where(eq(userStorages.userId, user.id));
    
    const allowedStorageIds = storageIds.map(s => s.id);
    
    const filesToDelete = await db
      .select({ 
        id: files.id, 
        path: files.path,
        userStorageId: files.userStorageId 
      })
      .from(files)
      .where(
        and(
          inArray(files.id, fileIds),
          inArray(files.userStorageId, allowedStorageIds)
        )
      );
    
    if (filesToDelete.length === 0) {
      return { success: false, message: t('noPermission') };
    }
    
    const validFileIds = filesToDelete.map(f => f.id);
    
    // 使用事务确保数据一致性
    await db.transaction(async (tx) => {
      // 级联删除所有关联数据
      await tx
        .delete(collectionMedia)
        .where(inArray(collectionMedia.fileId, validFileIds));
      
      await tx
        .delete(photoMetadata)
        .where(inArray(photoMetadata.fileId, validFileIds));
      
      await tx
        .delete(videoMetadata)
        .where(inArray(videoMetadata.fileId, validFileIds));
      
      await cleanHeroReferences(tx, validFileIds, user.id);
      await cleanCollectionCoverReferences(tx, validFileIds);
      
      await tx
        .delete(files)
        .where(inArray(files.id, validFileIds));
    });
    
    // 删除物理文件（在事务外执行）
    const physicalDeleteErrors = [];
    for (const file of filesToDelete) {
      try {
        await deletePhysicalFile(file.userStorageId, file.path);
      } catch (error) {
        console.error(`Failed to delete physical file: ${file.path}`, error);
        physicalDeleteErrors.push(file.path);
      }
    }
    
    // 重新验证页面
    revalidatePathForAllLocales('/dashboard/media');
    revalidatePathForAllLocales('/gallery');
    
    if (physicalDeleteErrors.length > 0) {
      return {
        success: true,
        message: t('deletedWithWarning', { 
          count: validFileIds.length,
          failedCount: physicalDeleteErrors.length 
        }),
      };
    }
    
    return { 
      success: true, 
      message: t('deleted', { count: validFileIds.length }) 
    };
  } catch (error) {
    console.error('Delete failed:', error);
    
    // 检查是否是数据库事务错误
    if (error instanceof Error && error.message.includes('transaction')) {
      return { 
        success: false, 
        message: t('transactionFailed') 
      };
    }
    
    return { 
      success: false, 
      message: t('deleteFailed') 
    };
  }
}
```

#### 前端错误显示

```typescript
// 使用 toast 显示错误
import { toast } from 'sonner';

const handleBatchDelete = async () => {
  try {
    const result = await deleteMediaFiles(Array.from(selectedIds));
    
    if (result.success) {
      toast.success(result.message);
      setSelectedIds(new Set());
      // 刷新列表
    } else {
      toast.error(result.message);
    }
  } catch (error) {
    toast.error('操作失败，请稍后重试');
    console.error('Delete error:', error);
  }
};
```

### 错误日志记录

```typescript
// app/lib/logger.ts (新建)
export function logError(
  context: string,
  error: unknown,
  metadata?: Record<string, any>
) {
  const errorInfo = {
    context,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    metadata,
    timestamp: new Date().toISOString(),
  };
  
  console.error(JSON.stringify(errorInfo, null, 2));
  
  // 生产环境可以发送到错误追踪服务（如 Sentry）
  if (process.env.NODE_ENV === 'production') {
    // sendToErrorTracking(errorInfo);
  }
}
```


## Testing Strategy

### 测试方法论

本项目采用双重测试策略：

1. **单元测试（Unit Tests）**：验证具体示例、边界情况和错误条件
2. **属性测试（Property-Based Tests）**：验证通用属性在所有输入下的正确性

两种测试方法互补，共同确保系统的全面覆盖。

### 测试框架选择

- **单元测试框架**：Vitest
- **属性测试库**：fast-check
- **React 组件测试**：@testing-library/react
- **API 测试**：supertest

### 属性测试配置

每个属性测试必须：
- 运行至少 100 次迭代（由于随机化）
- 引用对应的设计文档属性
- 使用标签格式：`Feature: gallery-features-completion, Property {number}: {property_text}`

### 测试文件组织

```
tests/
├── unit/
│   ├── hero-photos.test.ts
│   ├── collections.test.ts
│   ├── upload.test.ts
│   ├── batch-delete.test.ts
│   ├── batch-download.test.ts
│   ├── live-photo.test.ts
│   └── data-consistency.test.ts
├── property/
│   ├── hero-photos.property.test.ts
│   ├── collections.property.test.ts
│   ├── upload.property.test.ts
│   ├── batch-operations.property.test.ts
│   └── data-consistency.property.test.ts
└── integration/
    ├── upload-flow.test.ts
    ├── delete-flow.test.ts
    └── gallery-flow.test.ts
```

### 单元测试示例

#### Hero 照片测试

```typescript
// tests/unit/hero-photos.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { fetchHeroPhotosForHome } from '@/app/lib/data';

describe('Hero Photos', () => {
  it('should return empty array when no hero photos configured', async () => {
    // Feature: gallery-features-completion, Property 2
    const result = await fetchHeroPhotosForHome({ userId: 999 });
    expect(result).toEqual([]);
  });
  
  it('should filter out unpublished photos', async () => {
    // Feature: gallery-features-completion, Property 1
    // Setup: Create hero config with mix of published/unpublished photos
    // Assert: Only published photos are returned
  });
  
  it('should filter out photos from disabled storage', async () => {
    // Feature: gallery-features-completion, Property 1
    // Setup: Create hero config with photos from disabled storage
    // Assert: Photos from disabled storage are excluded
  });
  
  it('should respect limit parameter', async () => {
    // Feature: gallery-features-completion, Property 1
    const result = await fetchHeroPhotosForHome({ limit: 5 });
    expect(result.length).toBeLessThanOrEqual(5);
  });
});
```

#### 上传功能测试

```typescript
// tests/unit/upload.test.ts
import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/upload/route';

describe('Upload API', () => {
  it('should reject non-admin users', async () => {
    // Feature: gallery-features-completion, Property 11
    const formData = new FormData();
    formData.append('storageId', '1');
    formData.append('file', new File(['test'], 'test.jpg'));
    
    const request = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    const response = await POST(request);
    expect(response.status).toBe(403);
  });
  
  it('should reject files larger than 100MB', async () => {
    // Feature: gallery-features-completion, Property 11
    // Setup: Create large file
    // Assert: Upload fails with size error
  });
  
  it('should reject unsupported file types', async () => {
    // Feature: gallery-features-completion, Property 11
    // Setup: Create .exe file
    // Assert: Upload fails with type error
  });
});
```

#### 批量删除测试

```typescript
// tests/unit/batch-delete.test.ts
import { describe, it, expect } from 'vitest';
import { deleteMediaFiles } from '@/app/lib/actions';

describe('Batch Delete', () => {
  it('should delete all related records in transaction', async () => {
    // Feature: gallery-features-completion, Property 21
    // Setup: Create file with metadata and collection associations
    const fileId = await createTestFile();
    
    await deleteMediaFiles([fileId]);
    
    // Assert: All related records are deleted
    const fileExists = await db.query.files.findFirst({
      where: eq(files.id, fileId),
    });
    expect(fileExists).toBeNull();
    
    const metadataExists = await db.query.photoMetadata.findFirst({
      where: eq(photoMetadata.fileId, fileId),
    });
    expect(metadataExists).toBeNull();
  });
  
  it('should rollback on error', async () => {
    // Feature: gallery-features-completion, Property 38
    // Setup: Create file and simulate error during deletion
    // Assert: No records are deleted (transaction rolled back)
  });
  
  it('should clean hero references', async () => {
    // Feature: gallery-features-completion, Property 23
    // Setup: Add file to hero config
    const fileId = await createTestFile();
    await setHeroPhotos([fileId], true);
    
    await deleteMediaFiles([fileId]);
    
    // Assert: File ID removed from hero config
    const heroIds = await fetchHeroPhotoIdsByUser(userId);
    expect(heroIds).not.toContain(fileId);
  });
});
```

### 属性测试示例

#### Hero 照片属性测试

```typescript
// tests/property/hero-photos.property.test.ts
import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { fetchHeroPhotosForHome } from '@/app/lib/data';

describe('Hero Photos Properties', () => {
  it('should always return published photos only', async () => {
    // Feature: gallery-features-completion, Property 1
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          isPublished: fc.boolean(),
          storageDisabled: fc.boolean(),
        })),
        async (photos) => {
          // Setup: Create photos with random published/disabled states
          // Act: Fetch hero photos
          const result = await fetchHeroPhotosForHome();
          
          // Assert: All returned photos are published and from enabled storage
          return result.every(photo => 
            photo.isPublished && !photo.storageDisabled
          );
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('should maintain carousel index within bounds', () => {
    // Feature: gallery-features-completion, Property 3
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0, max: 100 }),
        (images, clicks) => {
          let index = 0;
          for (let i = 0; i < clicks; i++) {
            index = (index + 1) % images.length;
          }
          return index >= 0 && index < images.length;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

#### 集合属性测试

```typescript
// tests/property/collections.property.test.ts
import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { fetchCollections } from '@/app/lib/data';

describe('Collections Properties', () => {
  it('should only return published collections when filtered', async () => {
    // Feature: gallery-features-completion, Property 6
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({
          title: fc.string(),
          status: fc.constantFrom('draft', 'published'),
        })),
        async (collections) => {
          // Setup: Create collections with random statuses
          // Act: Fetch published collections
          const result = await fetchCollections({ status: 'published' });
          
          // Assert: All returned collections are published
          return result.every(c => c.status === 'published');
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('should respect limit parameter', async () => {
    // Feature: gallery-features-completion, Property 7
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        fc.array(fc.record({ title: fc.string() }), { minLength: 10 }),
        async (limit, collections) => {
          // Setup: Create many collections
          // Act: Fetch with limit
          const result = await fetchCollections({ limit });
          
          // Assert: Result length <= limit
          return result.length <= limit;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('should generate default covers when not set', async () => {
    // Feature: gallery-features-completion, Property 9
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.integer({ min: 1 }),
          coverImages: fc.constant(null),
          mediaItems: fc.array(fc.integer({ min: 1 }), { minLength: 3 }),
        }),
        async (collection) => {
          // Setup: Create collection without explicit covers
          // Act: Fetch collection
          const result = await fetchCollectionById(collection.id);
          
          // Assert: Covers array is populated with first 3 media items
          return result.covers.length > 0 && result.covers.length <= 3;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

#### 批量操作属性测试

```typescript
// tests/property/batch-operations.property.test.ts
import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { deleteMediaFiles } from '@/app/lib/actions';

describe('Batch Operations Properties', () => {
  it('should clean all hero references after deletion', async () => {
    // Feature: gallery-features-completion, Property 23
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 1, maxLength: 10 }),
        async (fileIds) => {
          // Setup: Add files to hero config
          await setHeroPhotos(fileIds, true);
          
          // Act: Delete files
          await deleteMediaFiles(fileIds);
          
          // Assert: No deleted file IDs in hero config
          const heroIds = await fetchHeroPhotoIdsByUser(userId);
          return fileIds.every(id => !heroIds.includes(id));
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('should clean all collection cover references after deletion', async () => {
    // Feature: gallery-features-completion, Property 24
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 1, maxLength: 10 }),
        async (fileIds) => {
          // Setup: Add files to collection covers
          // Act: Delete files
          await deleteMediaFiles(fileIds);
          
          // Assert: No deleted file IDs in any collection covers
          const collections = await fetchCollections();
          return collections.every(c => 
            !c.coverImages?.some(id => fileIds.includes(id))
          );
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('should include all selected files in ZIP', async () => {
    // Feature: gallery-features-completion, Property 25
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 2, maxLength: 10 }),
        async (fileIds) => {
          // Act: Generate ZIP
          const zipPath = await createZipFromFileIds(fileIds);
          
          // Assert: ZIP contains all files
          const zipContents = await listZipContents(zipPath);
          return zipContents.length === fileIds.length;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### 集成测试示例

```typescript
// tests/integration/upload-flow.test.ts
import { describe, it, expect } from 'vitest';

describe('Upload Flow Integration', () => {
  it('should complete full upload workflow', async () => {
    // 1. Login as admin
    // 2. Select storage
    // 3. Upload file
    // 4. Verify file appears in media library
    // 5. Verify metadata is extracted
    // 6. Verify thumbnail is generated
  });
});
```

### 测试覆盖率目标

- **单元测试覆盖率**：> 80%
- **属性测试覆盖率**：所有核心业务逻辑
- **集成测试覆盖率**：所有关键用户流程

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行单元测试
pnpm test:unit

# 运行属性测试
pnpm test:property

# 运行集成测试
pnpm test:integration

# 生成覆盖率报告
pnpm test:coverage
```


## Performance Optimization

### 性能目标

- **首页加载时间**：< 2 秒（LCP）
- **画廊滚动帧率**：> 60 FPS
- **上传响应时间**：< 100ms（开始上传）
- **缩略图加载时间**：< 500ms
- **批量操作响应时间**：< 3 秒（100 个文件）

### 优化策略

#### 1. 图片加载优化

**BlurHash 占位符**
```typescript
// 使用 BlurHash 作为图片加载占位符
<Image
  src={item.thumbUrl}
  placeholder="blur"
  blurDataURL={decodeBlurHash(item.blurHash)}
  alt={item.title}
/>
```

**渐进式加载**
```typescript
// 先加载缩略图，再加载原图
const [imageUrl, setImageUrl] = useState(item.thumbUrl);

useEffect(() => {
  const img = new Image();
  img.src = item.url;
  img.onload = () => setImageUrl(item.url);
}, [item.url]);
```

**懒加载**
```typescript
// 使用 Intersection Observer 实现懒加载
<img
  src={item.thumbUrl}
  loading="lazy"
  alt={item.title}
/>
```

#### 2. 无限滚动优化

**虚拟滚动**
```typescript
// 使用 react-window 或 react-virtuoso 实现虚拟滚动
import { Virtuoso } from 'react-virtuoso';

<Virtuoso
  data={items}
  itemContent={(index, item) => <MediaCard item={item} />}
  endReached={loadMore}
/>
```

**分页加载**
```typescript
// 每次加载 20-30 个项目
const ITEMS_PER_PAGE = 24;

const loadMore = async () => {
  const nextPage = Math.floor(items.length / ITEMS_PER_PAGE) + 1;
  const newItems = await fetchPublishedMediaForGallery({
    limit: ITEMS_PER_PAGE,
    offset: (nextPage - 1) * ITEMS_PER_PAGE,
  });
  setItems([...items, ...newItems]);
};
```

#### 3. 数据库查询优化

**索引优化**
```sql
-- 为常用查询字段添加索引
CREATE INDEX idx_files_published ON files(is_published);
CREATE INDEX idx_files_storage_published ON files(user_storage_id, is_published);
CREATE INDEX idx_files_mtime ON files(mtime DESC);
CREATE INDEX idx_photo_metadata_date_shot ON photo_metadata(date_shot DESC);
CREATE INDEX idx_collection_media_collection ON collection_media(collection_id, sort_order);
```

**查询优化**
```typescript
// 使用 JOIN 减少查询次数
const items = await db
  .select({
    // 一次查询获取所有需要的数据
    file: files,
    metadata: photoMetadata,
    storage: userStorages,
  })
  .from(files)
  .leftJoin(photoMetadata, eq(files.id, photoMetadata.fileId))
  .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
  .where(eq(files.isPublished, true))
  .limit(24);
```

**查询结果缓存**
```typescript
// 使用 React Query 缓存查询结果
import { useQuery } from '@tanstack/react-query';

const { data: heroPhotos } = useQuery({
  queryKey: ['heroPhotos'],
  queryFn: fetchHeroPhotosForHome,
  staleTime: 5 * 60 * 1000, // 5 分钟
});
```

#### 4. 上传性能优化

**并发上传控制**
```typescript
// 限制同时上传的文件数量
const MAX_CONCURRENT_UPLOADS = 3;

async function uploadFiles(files: File[]) {
  const queue = [...files];
  const results = [];
  
  while (queue.length > 0) {
    const batch = queue.splice(0, MAX_CONCURRENT_UPLOADS);
    const batchResults = await Promise.all(
      batch.map(file => uploadSingleFile(file))
    );
    results.push(...batchResults);
  }
  
  return results;
}
```

**分片上传（大文件）**
```typescript
// 对于大于 10MB 的文件，使用分片上传
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

async function uploadLargeFile(file: File) {
  if (file.size <= 10 * 1024 * 1024) {
    return uploadSingleFile(file);
  }
  
  const chunks = Math.ceil(file.size / CHUNK_SIZE);
  const uploadId = generateUploadId();
  
  for (let i = 0; i < chunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    
    await uploadChunk(uploadId, i, chunk);
  }
  
  return completeUpload(uploadId);
}
```

#### 5. 元数据提取优化

**异步处理**
```typescript
// 上传完成后立即返回，元数据提取在后台进行
export async function POST(request: Request) {
  // ... 保存文件 ...
  
  const fileRecord = await db.insert(files).values({...}).returning();
  
  // 异步提取元数据，不阻塞响应
  extractMetadataAsync(fileRecord[0].id, savedFile.fullPath);
  
  return NextResponse.json({ success: true, fileId: fileRecord[0].id });
}

// 后台任务
async function extractMetadataAsync(fileId: number, filePath: string) {
  try {
    const metadata = await extractPhotoMetadata(filePath);
    await db.insert(photoMetadata).values({ fileId, ...metadata });
  } catch (error) {
    console.error('Metadata extraction failed:', error);
  }
}
```

**缩略图生成优化**
```typescript
// 使用 Sharp 的高性能配置
import sharp from 'sharp';

async function generateThumbnail(inputPath: string, outputPath: string) {
  await sharp(inputPath)
    .resize(400, 400, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({
      quality: 80,
      progressive: true,
    })
    .toFile(outputPath);
}
```

#### 6. 缓存策略

**静态资源缓存**
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/media/thumb/:id',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

**服务端缓存**
```typescript
// 使用 Next.js 的 unstable_cache
import { unstable_cache } from 'next/cache';

export const fetchHeroPhotosForHome = unstable_cache(
  async (options) => {
    // ... 查询逻辑 ...
  },
  ['hero-photos'],
  {
    revalidate: 300, // 5 分钟
    tags: ['hero-photos'],
  }
);
```

#### 7. 批量操作优化

**批量数据库操作**
```typescript
// 使用批量删除而不是循环删除
await db
  .delete(collectionMedia)
  .where(inArray(collectionMedia.fileId, fileIds));

// 而不是：
for (const fileId of fileIds) {
  await db.delete(collectionMedia).where(eq(collectionMedia.fileId, fileId));
}
```

**ZIP 生成优化**
```typescript
// 使用流式 ZIP 生成，避免内存溢出
import archiver from 'archiver';
import { createWriteStream } from 'fs';

async function createZipStream(files: Array<{ path: string; name: string }>) {
  const output = createWriteStream(tempZipPath);
  const archive = archiver('zip', {
    zlib: { level: 6 }, // 平衡压缩率和速度
  });
  
  archive.pipe(output);
  
  for (const file of files) {
    archive.file(file.path, { name: file.name });
  }
  
  await archive.finalize();
}
```

### 性能监控

**关键指标监控**
```typescript
// 使用 Web Vitals 监控性能
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // 发送到分析服务
  console.log(metric);
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

**数据库查询监控**
```typescript
// 记录慢查询
const startTime = Date.now();
const result = await db.query.files.findMany({...});
const duration = Date.now() - startTime;

if (duration > 1000) {
  console.warn(`Slow query detected: ${duration}ms`);
}
```


## Implementation Plan

### 开发阶段划分

#### Phase 1: 数据连接与基础功能（优先级：高）

**1.1 Hero 照片真实数据连接**
- 修改 `app/[locale]/(front)/page.tsx`，调用 `fetchHeroPhotosForHome()`
- 修改 `app/ui/front/front-home.tsx`，接收真实数据
- 实现降级方案（空数据时使用默认图片）
- 测试轮播功能和色调检测

**1.2 精选集合真实数据连接**
- 修改 `app/[locale]/(front)/page.tsx`，调用 `fetchCollections()`
- 修改 `app/ui/front/front-home.tsx`，渲染真实集合数据
- 处理封面图显示逻辑（使用 covers 数组）
- 测试集合卡片点击导航

**预计时间**：2-3 天

#### Phase 2: 上传功能实现（优先级：高）

**2.1 上传 API 开发**
- 创建 `app/api/upload/route.ts`
- 实现权限验证、文件验证、存储保存
- 实现数据库记录创建
- 添加错误处理和日志记录

**2.2 元数据提取模块**
- 创建 `app/lib/metadata-extractor.ts`
- 实现照片元数据提取（Sharp + Exifr）
- 实现视频元数据提取（FFmpeg）
- 实现缩略图和 BlurHash 生成

**2.3 上传中心组件修改**
- 修改 `app/ui/admin/upload-center.tsx`
- 实现真实上传逻辑（替换 FileReader 模拟）
- 实现进度监听和状态更新
- 添加错误处理和重试机制

**预计时间**：4-5 天

#### Phase 3: 批量操作功能（优先级：高）

**3.1 批量删除功能**
- 在 `app/lib/actions.ts` 中添加 `deleteMediaFiles()` 函数
- 实现级联删除逻辑（collection_media、metadata、files）
- 实现 Hero 引用清理函数 `cleanHeroReferences()`
- 实现集合封面引用清理函数 `cleanCollectionCoverReferences()`
- 实现物理文件删除逻辑

**3.2 批量下载功能**
- 创建 `app/api/download/route.ts`
- 创建 `app/lib/zip-generator.ts`
- 实现单文件直接下载
- 实现多文件 ZIP 打包下载
- 实现临时文件清理机制

**3.3 媒体库组件修改**
- 修改 `app/ui/admin/media/media-library.tsx`
- 添加批量选择 UI（复选框）
- 添加批量操作工具栏
- 实现确认对话框
- 集成删除和下载功能

**预计时间**：4-5 天

#### Phase 4: UI/UX 优化（优先级：中）

**4.1 媒体详情模态框**
- 创建 `app/ui/front/media-detail-modal.tsx`
- 实现大尺寸预览图显示
- 创建 EXIF 信息面板组件
- 实现键盘导航（ESC、左右箭头）
- 实现视频播放控件

**4.2 筛选器优化**
- 修改 `app/ui/admin/media/media-filter-bar.tsx`
- 实现基础筛选和高级筛选分离
- 添加高级筛选折叠/展开功能
- 实现激活筛选条件计数
- 添加清除所有筛选按钮

**4.3 前台画廊筛选和排序**
- 创建 `app/ui/front/gallery-filter.tsx`
- 实现媒体类型筛选（全部/照片/视频）
- 实现排序选项（最新/最旧）
- 修改 `app/[locale]/(front)/gallery/page.tsx` 集成筛选器
- 确保筛选后保持无限滚动功能

**预计时间**：3-4 天

#### Phase 5: 实况照片支持（优先级：中）

**5.1 实况照片检测和标识**
- 修改或创建 `app/ui/front/media-card.tsx`
- 实现 liveType 检测逻辑
- 添加实况照片图标显示

**5.2 Hover-to-Play 功能**
- 实现鼠标悬停播放视频
- 实现鼠标移开停止播放
- 添加视频预加载逻辑
- 实现循环播放和静音配置

**5.3 移动端适配**
- 检测触摸设备
- 实现点击切换播放
- 测试移动端交互体验

**5.4 详情模态框集成**
- 在详情模态框中添加实况照片播放控制
- 实现播放/暂停按钮

**预计时间**：2-3 天

#### Phase 6: 数据一致性修复（优先级：高）

**6.1 级联删除函数完善**
- 修改 `app/lib/actions.ts` 中的 `deleteUserStorage()`
- 实现完整的级联清理流程
- 添加事务支持确保原子性

**6.2 引用清理函数**
- 实现 `cleanHeroReferences()` 函数
- 实现 `cleanCollectionCoverReferences()` 函数
- 添加单元测试验证清理逻辑

**6.3 批量删除集成**
- 在 `deleteMediaFiles()` 中集成引用清理
- 添加事务回滚机制
- 测试各种删除场景

**预计时间**：2-3 天

#### Phase 7: 测试和优化（优先级：高）

**7.1 单元测试**
- 编写 Hero 照片测试
- 编写集合测试
- 编写上传功能测试
- 编写批量操作测试
- 编写数据一致性测试

**7.2 属性测试**
- 编写 Hero 照片属性测试
- 编写集合属性测试
- 编写批量操作属性测试
- 编写数据一致性属性测试

**7.3 集成测试**
- 编写上传流程集成测试
- 编写删除流程集成测试
- 编写画廊浏览集成测试

**7.4 性能优化**
- 添加数据库索引
- 实现查询结果缓存
- 优化图片加载策略
- 优化无限滚动性能

**预计时间**：4-5 天

### 总体时间估算

- **Phase 1**：2-3 天
- **Phase 2**：4-5 天
- **Phase 3**：4-5 天
- **Phase 4**：3-4 天
- **Phase 5**：2-3 天
- **Phase 6**：2-3 天
- **Phase 7**：4-5 天

**总计**：21-28 天（约 4-6 周）

### 依赖关系

```
Phase 1 (数据连接)
    ↓
Phase 2 (上传功能) ← 必须先完成
    ↓
Phase 3 (批量操作) ← 依赖上传功能
    ↓
Phase 6 (数据一致性) ← 依赖批量操作
    ↓
Phase 4 (UI/UX 优化) ← 可并行
Phase 5 (实况照片) ← 可并行
    ↓
Phase 7 (测试和优化) ← 最后进行
```

### 风险评估

**高风险项**：
1. **上传功能**：涉及多存储源支持，需要处理各种边界情况
2. **元数据提取**：依赖外部库（Sharp、FFmpeg），可能遇到兼容性问题
3. **数据一致性**：级联删除逻辑复杂，需要确保事务完整性

**中风险项**：
1. **批量操作性能**：大量文件操作可能导致性能问题
2. **实况照片播放**：需要处理各种视频格式和浏览器兼容性

**低风险项**：
1. **数据连接**：主要是前端组件修改，风险较低
2. **UI/UX 优化**：主要是界面改进，不涉及核心逻辑

### 里程碑

**Milestone 1**：数据连接完成（Week 1）
- Hero 照片和精选集合显示真实数据
- 前台页面可正常浏览

**Milestone 2**：上传功能完成（Week 2-3）
- 管理员可上传文件到各种存储源
- 元数据自动提取
- 缩略图和 BlurHash 生成

**Milestone 3**：批量操作完成（Week 3-4）
- 批量删除功能可用
- 批量下载功能可用
- 数据一致性得到保证

**Milestone 4**：功能完善（Week 4-5）
- UI/UX 优化完成
- 实况照片播放功能完成
- 所有核心功能可用

**Milestone 5**：测试和发布（Week 5-6）
- 所有测试通过
- 性能优化完成
- 准备生产部署


## Security Considerations

### 认证和授权

#### 1. 上传权限控制

```typescript
// 所有上传操作必须验证管理员权限
async function requireAdminUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user?.email;
  
  if (!email) {
    throw new Error('未登录');
  }
  
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  
  if (!user || user.banned) {
    throw new Error('用户不存在或已被禁用');
  }
  
  if (user.role !== 'admin') {
    throw new Error('权限不足，仅管理员可执行此操作');
  }
  
  return user;
}
```

#### 2. 文件访问控制

```typescript
// 验证用户是否有权访问文件
async function verifyFileAccess(fileId: number, userId: number) {
  const file = await db.query.files.findFirst({
    where: eq(files.id, fileId),
    with: { storage: true },
  });
  
  if (!file) {
    throw new Error('文件不存在');
  }
  
  // 检查存储源所有权
  if (file.storage.userId !== userId) {
    throw new Error('无权访问此文件');
  }
  
  return file;
}
```

### 输入验证

#### 1. 文件上传验证

```typescript
// 验证文件类型
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
];

function validateFileType(file: File): boolean {
  return ALLOWED_MIME_TYPES.includes(file.type);
}

// 验证文件大小
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function validateFileSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE;
}

// 验证文件名
function sanitizeFileName(filename: string): string {
  // 移除危险字符
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 255);
}
```

#### 2. 路径遍历防护

```typescript
// 防止路径遍历攻击
import path from 'path';

function validateFilePath(basePath: string, filePath: string): boolean {
  const resolvedPath = path.resolve(basePath, filePath);
  const resolvedBase = path.resolve(basePath);
  
  // 确保解析后的路径在基础路径内
  return resolvedPath.startsWith(resolvedBase);
}
```

#### 3. SQL 注入防护

```typescript
// 使用 Drizzle ORM 的参数化查询，自动防止 SQL 注入
// 错误示例（不要这样做）：
// const query = `SELECT * FROM files WHERE title = '${userInput}'`;

// 正确示例：
const files = await db
  .select()
  .from(files)
  .where(eq(files.title, userInput)); // 自动参数化
```

### 数据保护

#### 1. 敏感信息脱敏

```typescript
// 不要在日志中记录敏感信息
function logError(error: unknown, context: string) {
  const sanitizedError = {
    message: error instanceof Error ? error.message : String(error),
    context,
    timestamp: new Date().toISOString(),
    // 不记录完整的堆栈跟踪（可能包含敏感路径）
  };
  
  console.error(JSON.stringify(sanitizedError));
}
```

#### 2. 文件存储安全

```typescript
// 本地存储：确保文件权限正确
import { chmod } from 'fs/promises';

async function saveFileSecurely(path: string, content: Buffer) {
  await writeFile(path, content);
  await chmod(path, 0o644); // rw-r--r--
}

// S3 存储：使用私有 ACL
const s3Client = new S3Client({
  region: config.region,
  credentials: {
    accessKeyId: config.accessKey,
    secretAccessKey: config.secretKey,
  },
});

await s3Client.send(new PutObjectCommand({
  Bucket: config.bucket,
  Key: filePath,
  Body: fileBuffer,
  ACL: 'private', // 私有访问
}));
```

#### 3. 临时文件清理

```typescript
// 确保临时文件被及时清理
import { unlink } from 'fs/promises';

async function processFileWithCleanup(tempPath: string) {
  try {
    // 处理文件
    await processFile(tempPath);
  } finally {
    // 无论成功或失败，都清理临时文件
    try {
      await unlink(tempPath);
    } catch (error) {
      console.error('Failed to cleanup temp file:', error);
    }
  }
}
```

### XSS 防护

#### 1. 输出转义

```typescript
// React 自动转义，但要注意 dangerouslySetInnerHTML
// 错误示例（不要这样做）：
// <div dangerouslySetInnerHTML={{ __html: userInput }} />

// 正确示例：
import DOMPurify from 'isomorphic-dompurify';

<div dangerouslySetInnerHTML={{ 
  __html: DOMPurify.sanitize(userInput) 
}} />
```

#### 2. 文件名显示

```typescript
// 显示用户上传的文件名时进行转义
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
```

### CSRF 防护

```typescript
// Next.js 的 Server Actions 自动包含 CSRF 保护
// 确保所有修改操作使用 Server Actions 或 POST 请求

// API 路由中验证 Origin
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  
  if (origin && !origin.includes(host || '')) {
    return NextResponse.json(
      { error: 'Invalid origin' },
      { status: 403 }
    );
  }
  
  // 继续处理请求
}
```

### 速率限制

```typescript
// 使用 upstash/ratelimit 实现速率限制
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 每分钟 10 次
});

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }
  
  // 继续处理请求
}
```

### 安全配置

#### 1. 环境变量

```bash
# .env.local（不要提交到版本控制）
DATABASE_URL="postgresql://..."
BETTER_AUTH_SECRET="..." # 使用 openssl rand -base64 32 生成
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
```

#### 2. Next.js 安全头

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};
```

### 审计日志

```typescript
// 记录关键操作
async function auditLog(
  userId: number,
  action: string,
  resource: string,
  details?: Record<string, any>
) {
  await db.insert(auditLogs).values({
    userId,
    action,
    resource,
    details: JSON.stringify(details),
    ipAddress: request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent'),
    timestamp: new Date(),
  });
}

// 使用示例
await auditLog(user.id, 'DELETE', 'files', { fileIds });
```

## Deployment Considerations

### 环境配置

#### 开发环境
```bash
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/gallery_dev
BETTER_AUTH_URL=http://localhost:3000
```

#### 生产环境
```bash
NODE_ENV=production
DATABASE_URL=postgresql://prod-host:5432/gallery_prod
BETTER_AUTH_URL=https://yourdomain.com
BETTER_AUTH_SECRET=<生成的随机密钥>
```

### 数据库迁移

```bash
# 生成迁移文件
pnpm drizzle-kit generate

# 执行迁移
pnpm drizzle-kit migrate

# 验证迁移
pnpm drizzle-kit check
```

### 构建和部署

```bash
# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 或使用 PM2
pm2 start npm --name "gallery" -- start
```

### 监控和日志

- 使用 Sentry 或类似服务进行错误追踪
- 配置日志聚合（如 Datadog、CloudWatch）
- 设置性能监控（如 Vercel Analytics）
- 配置数据库慢查询日志

### 备份策略

- 数据库：每日自动备份，保留 30 天
- 文件存储：根据存储类型配置备份（S3 版本控制、本地定期备份）
- 配置文件：版本控制管理

## Conclusion

本设计文档详细描述了 Gallery Features Completion 项目的技术实现方案，涵盖了从架构设计到具体实现的各个方面。通过遵循本文档的指导，开发团队可以系统地完成以下核心功能：

1. **前台数据真实化**：将硬编码数据替换为数据库驱动的动态内容
2. **完整的上传流程**：支持多存储源、自动元数据提取、进度反馈
3. **高效的批量操作**：批量删除和下载，提升管理效率
4. **实况照片支持**：完善的播放体验和移动端适配
5. **优化的用户界面**：改进的筛选器、详情模态框和画廊交互
6. **数据一致性保证**：完整的级联删除和引用清理机制

本设计遵循以下原则：

- **安全第一**：严格的权限控制、输入验证和数据保护
- **性能优化**：缓存策略、懒加载、虚拟滚动等优化手段
- **可测试性**：完整的单元测试和属性测试覆盖
- **可维护性**：清晰的代码结构、完善的错误处理、详细的文档

通过 4-6 周的开发周期，项目将从半成品状态升级为生产级的图库管理系统，为用户提供完整、流畅、安全的使用体验。

