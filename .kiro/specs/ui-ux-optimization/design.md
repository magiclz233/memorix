# UI/UX 全面优化设计文档

## 1. 设计概述

### 1.1 设计原则
- **简洁优先**：减少视觉噪音，突出核心功能
- **渐进式展开**：复杂功能分层展示，避免一次性呈现过多信息
- **即时反馈**：所有操作提供清晰的视觉和文本反馈
- **一致性**：统一的设计语言和交互模式
- **性能优先**：优化动画和渲染性能

### 1.2 设计目标
1. 降低媒体库筛选的视觉复杂度 50%
2. 提升上传中心批量上传效率 3 倍
3. 减少用户操作步骤 30%
4. 提升整体用户满意度至 4.5/5 分以上

### 1.3 技术栈
- **UI 框架**：React 19 + Next.js 16
- **组件库**：Shadcn UI (Radix UI)
- **动画库**：Framer Motion
- **状态管理**：React Hooks + Server Actions
- **样式方案**：Tailwind CSS
- **类型检查**：TypeScript

---

## 2. 媒体库筛选重设计

### 2.1 整体布局设计

#### 2.1.1 布局结构
```
┌─────────────────────────────────────────────────────────────┐
│ [搜索框]  [All][Local][NAS][S3]  [高级筛选▼]  [网格][列表] │ ← 一级筛选栏
├─────────────────────────────────────────────────────────────┤
│ 当前筛选: [Local ×] [已发布 ×] [图片 ×]  [清除全部]        │ ← 筛选状态栏（有筛选时显示）
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [高级筛选面板 - 可折叠]                                 │ │ ← 二级筛选面板（点击展开）
│ │ 存储实例: [Local #1] [Local #2] [All]                  │ │
│ │ 发布状态: [全部] [已发布] [未发布]                      │ │
│ │ 媒体类型: [全部] [图片] [视频] [动图]                  │ │
│ │ 日期范围: [开始日期] - [结束日期]                       │ │
│ │ Hero标记: [全部] [仅Hero] [非Hero]                     │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ [批量操作栏]                                                │ ← 选择模式时显示
├─────────────────────────────────────────────────────────────┤
│ [媒体网格/列表]                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 2.1.2 视觉层级
- **L1（始终可见）**：搜索框、存储类型快速切换、视图切换
- **L2（按需展开）**：高级筛选面板
- **L3（状态反馈）**：当前筛选 Chips、结果数量


### 2.2 组件设计

#### 2.2.1 搜索框组件
**组件名称**：`MediaSearchBar`

**功能**：
- 实时搜索（防抖 300ms）
- 支持文件名、标题、标签搜索
- 显示搜索建议（可选）
- 清除按钮

**技术实现**：
```typescript
// 使用 useDebounce hook
const debouncedSearch = useDebounce(searchTerm, 300);

// 搜索 API
const searchMedia = async (query: string) => {
  const params = new URLSearchParams({ q: query, ...filters });
  const res = await fetch(`/api/media/search?${params}`);
  return res.json();
};
```

**样式规范**：
- 高度：40px
- 圆角：rounded-full
- 背景：bg-white/80 dark:bg-zinc-900/80
- 边框：border-zinc-200 dark:border-zinc-800
- 图标：Search (Lucide)

#### 2.2.2 存储类型快速切换
**组件名称**：`StorageTypeFilter`

**功能**：
- 单选切换（All / Local / NAS / S3）
- 显示每个类型的文件数量
- 激活状态高亮

**技术实现**：
```typescript
const categories = [
  { id: 'all', label: 'All', icon: Database, count: totalCount },
  { id: 'local', label: 'Local', icon: HardDrive, count: localCount },
  { id: 'nas', label: 'NAS', icon: Server, count: nasCount },
  { id: 's3', label: 'S3', icon: Cloud, count: s3Count },
];
```

**样式规范**：
- 使用 Chip/Badge 风格
- 激活状态：bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900
- 未激活：bg-white text-zinc-600 hover:bg-zinc-100

#### 2.2.3 高级筛选面板
**组件名称**：`AdvancedFilterPanel`

**功能**：
- 可折叠展开
- 多维度筛选
- 筛选预设保存（可选）
- 快速重置

**技术实现**：
```typescript
// 使用 Collapsible 组件
<Collapsible open={isOpen} onOpenChange={setIsOpen}>
  <CollapsibleTrigger>
    <Button variant="ghost">
      高级筛选 {activeFiltersCount > 0 && `(${activeFiltersCount})`}
      <ChevronDown className={cn("transition", isOpen && "rotate-180")} />
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent>
    {/* 筛选选项 */}
  </CollapsibleContent>
</Collapsible>
```

**动画**：
- 展开/收起：300ms ease-in-out
- 高度自适应

#### 2.2.4 筛选状态 Chips
**组件名称**：`FilterChips`

**功能**：
- 显示当前激活的筛选条件
- 单独移除某个筛选
- 清除全部筛选

**技术实现**：
```typescript
const activeFilters = [
  { key: 'category', label: 'Local', value: 'local' },
  { key: 'published', label: '已发布', value: true },
  { key: 'mediaType', label: '图片', value: 'image' },
];

const removeFilter = (key: string) => {
  // 更新 URL 参数
  const params = new URLSearchParams(searchParams);
  params.delete(key);
  router.replace(`${pathname}?${params.toString()}`);
};
```

**样式规范**：
- 使用 Badge 组件
- 带 X 按钮
- 颜色：bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10

### 2.3 交互流程

#### 2.3.1 筛选流程
1. 用户点击存储类型 → 立即筛选，显示骨架屏
2. 用户点击"高级筛选" → 展开面板
3. 用户选择筛选条件 → 实时更新结果
4. 筛选条件显示为 Chips → 可单独移除
5. 点击"清除全部" → 重置所有筛选

#### 2.3.2 URL 同步
- 所有筛选条件同步到 URL 参数
- 支持分享筛选结果
- 浏览器前进/后退支持

**URL 格式**：
```
/dashboard/media?category=local&storageId=1&published=true&mediaType=image&dateFrom=2024-01-01&dateTo=2024-12-31
```

### 2.4 性能优化

#### 2.4.1 虚拟滚动
- 使用 `react-window` 或 `@tanstack/react-virtual`
- 只渲染可见区域的媒体项
- 支持动态高度（Masonry 布局）

#### 2.4.2 图片懒加载
- 使用 Next.js Image 组件
- 优先加载可见区域
- BlurHash 占位符

#### 2.4.3 筛选防抖
- 搜索输入防抖 300ms
- 日期范围选择防抖 500ms
- 避免频繁请求

---

## 3. 上传中心重构（任务机制）

### 3.1 核心概念：任务（Task）机制

#### 3.1.1 设计理念
传统的文件队列模式在批量上传场景下存在以下问题：
- 文件列表过长，难以管理
- 缺乏逻辑分组，无法区分不同批次
- 状态管理复杂，难以追踪整体进度

**任务机制**将上传操作组织为独立的任务单元：
- 每次上传操作创建一个任务（例如："2024 Spring Collection"）
- 一个任务包含多个文件（例如 100 个图片/视频）
- 任务有独立的进度、状态、元数据
- 支持任务级别和文件级别的操作

#### 3.1.2 任务状态定义
```typescript
type TaskStatus = 
  | 'uploading'   // 正在上传
  | 'queued'      // 等待中
  | 'completed'   // 已完成
  | 'paused'      // 已暂停
  | 'failed';     // 失败

type FileStatus = 
  | 'uploading'   // 正在上传
  | 'waiting'     // 等待中
  | 'done'        // 已完成
  | 'paused'      // 已暂停
  | 'error';      // 失败
```

### 3.2 整体布局设计

#### 3.2.1 主界面布局
```
┌─────────────────────────────────────────────────────────────┐
│ 上传中心                                    [+ 新建上传任务] │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📊 统计卡片区                                           │ │
│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │ │
│ │ │正在上传  │ │等待中    │ │传输速度  │ │已完成    │   │ │
│ │ │   3      │ │   2      │ │ 2.5MB/s  │ │  15      │   │ │
│ │ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ 🔍 [搜索任务...]                    [全部][上传中][已完成] │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📦 2024 Spring Collection                    [⏸][查看] │ │
│ │ 100 个文件 · 2.5 GB                                     │ │
│ │ ████████████░░░░░░░░ 65%  ⏱ 剩余 2分钟                 │ │
│ │ 🏷 正在上传                                             │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📦 Product Photos - March                    [▶][查看] │ │
│ │ 50 个文件 · 1.2 GB                                      │ │
│ │ ░░░░░░░░░░░░░░░░░░░░ 0%                                │ │
│ │ 🏷 等待中                                               │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📦 Website Assets                            [✓][查看] │ │
│ │ 25 个文件 · 500 MB                                      │ │
│ │ ████████████████████ 100%  ✓ 已完成                   │ │
│ │ 🏷 已完成 · 2024-03-15 14:30                           │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### 3.2.2 创建任务页面布局
```
┌─────────────────────────────────────────────────────────────┐
│ ← 返回上传中心                                              │
├─────────────────────────────────────────────────────────────┤
│ 创建上传任务                                                │
├─────────────────────────────────────────────────────────────┤
│ 任务名称 *                                                  │
│ [2024 Spring Collection                                   ] │
│                                                             │
│ 目标存储 *                                                  │
│ [Local Storage ▼]                                           │
│                                                             │
│ 文件分类                                                    │
│ [照片 ▼]                                                    │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📁 拖拽文件或文件夹到这里                               │ │
│ │                                                         │ │
│ │ 或 [选择文件] [选择文件夹]                              │ │
│ │                                                         │ │
│ │ 已选择: 100 个文件 (2.5 GB)                             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ▼ 高级配置                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 并发上传数                                              │ │
│ │ ●────────○──────────  3                                │ │
│ │ 1                    10                                │ │
│ │                                                         │ │
│ │ 重复文件处理                                            │ │
│ │ ○ 跳过  ● 重命名  ○ 覆盖                               │ │
│ │                                                         │ │
│ │ 后处理插件                                              │ │
│ │ ☑ AI 自动标签                                          │ │
│ │ ☐ 视频转码 (H.264)                                     │ │
│ │ ☐ 图片压缩 (80% 质量)                                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                                    [取消] [开始上传]        │
└─────────────────────────────────────────────────────────────┘
```

#### 3.2.3 任务详情面板布局
```
┌─────────────────────────────────────────────────────────────┐
│ ← 返回任务列表                                              │
├─────────────────────────────────────────────────────────────┤
│ 📦 2024 Spring Collection                                   │
│ 100 个文件 · 2.5 GB · 目标: Local Storage                  │
│ ████████████░░░░░░░░ 65% (65/100)  ⏱ 剩余 2分钟            │
│                                                             │
│ [⏸ 暂停全部] [✕ 取消任务] [🔄 重试失败]                    │
├─────────────────────────────────────────────────────────────┤
│ 🔍 [搜索文件...]                    [全部][上传中][失败]   │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📷 IMG_0001.jpg                              [⏸][✕]    │ │
│ │ 2.5 MB  ████████░░ 80%  1.5 MB/s  ⏱ 30s               │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📷 IMG_0002.jpg                              [⏸][✕]    │ │
│ │ 3.1 MB  ████░░░░░░ 45%  2.0 MB/s  ⏱ 1m                │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📷 IMG_0003.jpg                              [▶][✕]    │ │
│ │ 1.8 MB  ░░░░░░░░░░ 0%   等待中                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📷 IMG_0004.jpg                              [✓]       │ │
│ │ 2.1 MB  ████████████ 100%  ✓ 已完成                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📷 IMG_0005.jpg                              [🔄][✕]   │ │
│ │ 4.5 MB  ⚠ 上传失败: 网络超时                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                                    [管理本组文件]           │
└─────────────────────────────────────────────────────────────┘
```

#### 3.2.4 响应式布局
- **桌面端（≥1024px）**：完整布局，统计卡片 4 列
- **平板端（768-1023px）**：统计卡片 2 列，任务卡片全宽
- **移动端（<768px）**：统计卡片 2 列，任务卡片全宽，操作按钮简化


### 3.3 数据结构设计

#### 3.3.1 任务数据结构
```typescript
type TaskStatus = 'uploading' | 'queued' | 'completed' | 'paused' | 'failed';

type UploadTask = {
  id: string;
  name: string;
  storageId: string;
  category?: string;
  status: TaskStatus;
  files: UploadFile[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  config: TaskConfig;
  metadata: TaskMetadata;
};

type TaskConfig = {
  concurrency: number; // 并发上传数 (1-10)
  duplicateHandling: 'skip' | 'rename' | 'overwrite';
  postProcessing: {
    autoTag: boolean;
    videoTranscode: boolean;
    imageCompress: boolean;
  };
};

type TaskMetadata = {
  totalFiles: number;
  totalSize: number;
  uploadedFiles: number;
  uploadedSize: number;
  failedFiles: number;
  progress: number; // 0-100
  speed: number; // bytes/s
  remainingTime: number; // seconds
};

type UploadFile = {
  id: string;
  taskId: string;
  file: File;
  status: FileStatus;
  progress: number;
  speed?: number;
  error?: string;
  uploadedSize: number;
  totalSize: number;
  startTime?: number;
  endTime?: number;
  phase?: UploadPhase;
};

type FileStatus = 'uploading' | 'waiting' | 'done' | 'paused' | 'error';
type UploadPhase = 'hashing' | 'uploading' | 'completing';
```

### 3.4 组件设计

#### 3.4.1 统计卡片组件
**组件名称**：`UploadStatsCards`

**功能**：
- 显示正在上传任务数
- 显示等待中任务数
- 显示当前传输速度
- 显示已完成文件数

**技术实现**：
```typescript
const stats = useMemo(() => {
  const uploadingTasks = tasks.filter(t => t.status === 'uploading').length;
  const queuedTasks = tasks.filter(t => t.status === 'queued').length;
  const totalSpeed = tasks
    .filter(t => t.status === 'uploading')
    .reduce((sum, t) => sum + t.metadata.speed, 0);
  const completedFiles = tasks.reduce(
    (sum, t) => sum + t.metadata.uploadedFiles, 
    0
  );
  
  return { uploadingTasks, queuedTasks, totalSpeed, completedFiles };
}, [tasks]);
```

**样式规范**：
```typescript
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  <Card>
    <CardHeader className="pb-2">
      <CardDescription>正在上传</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold font-mono">{stats.uploadingTasks}</div>
    </CardContent>
  </Card>
  {/* 其他卡片 */}
</div>
```

#### 3.4.2 任务卡片组件
**组件名称**：`TaskCard`

**功能**：
- 显示任务名称和元数据
- 显示整体进度条
- 显示状态标签
- 任务操作按钮（暂停/恢复/查看详情）

**布局**：
```typescript
<Card className="hover:shadow-lg transition-shadow">
  <CardHeader>
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5" />
          {task.name}
        </CardTitle>
        <CardDescription className="mt-1">
          {task.metadata.totalFiles} 个文件 · {formatBytes(task.metadata.totalSize)}
        </CardDescription>
      </div>
      <div className="flex gap-2">
        {task.status === 'uploading' && (
          <Button size="icon" variant="ghost" onClick={onPause}>
            <Pause className="h-4 w-4" />
          </Button>
        )}
        {task.status === 'paused' && (
          <Button size="icon" variant="ghost" onClick={onResume}>
            <Play className="h-4 w-4" />
          </Button>
        )}
        <Button size="icon" variant="ghost" onClick={onViewDetails}>
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </div>
  </CardHeader>
  <CardContent>
    <Progress value={task.metadata.progress} className="h-2" />
    <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
      <span>{task.metadata.progress}%</span>
      {task.status === 'uploading' && (
        <span>⏱ 剩余 {formatDuration(task.metadata.remainingTime)}</span>
      )}
    </div>
    <Badge variant={getStatusVariant(task.status)} className="mt-3">
      {getStatusLabel(task.status)}
    </Badge>
  </CardContent>
</Card>
```

#### 3.4.3 创建任务表单组件
**组件名称**：`CreateTaskForm`

**功能**：
- 任务名称输入
- 目标存储选择
- 文件分类选择
- 拖拽上传区域
- 高级配置（可折叠）

**技术实现**：
```typescript
const CreateTaskForm = () => {
  const [taskName, setTaskName] = useState('');
  const [storageId, setStorageId] = useState('');
  const [category, setCategory] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [config, setConfig] = useState<TaskConfig>({
    concurrency: 3,
    duplicateHandling: 'rename',
    postProcessing: {
      autoTag: false,
      videoTranscode: false,
      imageCompress: false,
    },
  });

  const handleSubmit = async () => {
    const task: UploadTask = {
      id: generateId(),
      name: taskName,
      storageId,
      category,
      status: 'queued',
      files: files.map(file => ({
        id: generateId(),
        taskId: '',
        file,
        status: 'waiting',
        progress: 0,
        uploadedSize: 0,
        totalSize: file.size,
      })),
      createdAt: new Date(),
      config,
      metadata: {
        totalFiles: files.length,
        totalSize: files.reduce((sum, f) => sum + f.size, 0),
        uploadedFiles: 0,
        uploadedSize: 0,
        failedFiles: 0,
        progress: 0,
        speed: 0,
        remainingTime: 0,
      },
    };
    
    await createTask(task);
    router.push('/dashboard/upload');
  };

  return (
    <Form>
      <FormField name="taskName" label="任务名称" required>
        <Input 
          value={taskName} 
          onChange={(e) => setTaskName(e.target.value)}
          placeholder="例如: 2024 Spring Collection"
        />
      </FormField>
      
      <FormField name="storage" label="目标存储" required>
        <Select value={storageId} onValueChange={setStorageId}>
          <SelectTrigger>
            <SelectValue placeholder="选择存储" />
          </SelectTrigger>
          <SelectContent>
            {storages.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      
      <FormField name="category" label="文件分类">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue placeholder="选择分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="photo">照片</SelectItem>
            <SelectItem value="video">视频</SelectItem>
            <SelectItem value="document">文档</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
      
      <DropZone onFilesSelected={setFiles} />
      
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-start">
            <ChevronDown className="h-4 w-4 mr-2" />
            高级配置
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <AdvancedConfig config={config} onChange={setConfig} />
        </CollapsibleContent>
      </Collapsible>
      
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          取消
        </Button>
        <Button onClick={handleSubmit} disabled={!taskName || !storageId || files.length === 0}>
          开始上传
        </Button>
      </div>
    </Form>
  );
};
```

#### 3.4.4 任务详情组件
**组件名称**：`TaskDetail`

**功能**：
- 显示任务信息和进度
- 显示文件列表
- 支持搜索和筛选文件
- 文件级别操作

**技术实现**：
```typescript
const TaskDetail = ({ taskId }: { taskId: string }) => {
  const task = useTask(taskId);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FileStatus | 'all'>('all');
  
  const filteredFiles = useMemo(() => {
    let files = task.files;
    
    if (searchQuery) {
      files = files.filter(f => 
        f.file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      files = files.filter(f => f.status === statusFilter);
    }
    
    return files;
  }, [task.files, searchQuery, statusFilter]);
  
  return (
    <div className="space-y-6">
      {/* 任务头部 */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6" />
          {task.name}
        </h1>
        <p className="text-muted-foreground mt-1">
          {task.metadata.totalFiles} 个文件 · {formatBytes(task.metadata.totalSize)} · 
          目标: {task.storageId}
        </p>
        <Progress value={task.metadata.progress} className="h-3 mt-4" />
        <div className="flex items-center justify-between mt-2 text-sm">
          <span>
            {task.metadata.progress}% ({task.metadata.uploadedFiles}/{task.metadata.totalFiles})
          </span>
          {task.status === 'uploading' && (
            <span>⏱ 剩余 {formatDuration(task.metadata.remainingTime)}</span>
          )}
        </div>
      </div>
      
      {/* 操作按钮 */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onPauseAll}>
          <Pause className="h-4 w-4 mr-2" />
          暂停全部
        </Button>
        <Button variant="outline" onClick={onCancelTask}>
          <X className="h-4 w-4 mr-2" />
          取消任务
        </Button>
        <Button variant="outline" onClick={onRetryFailed}>
          <RotateCw className="h-4 w-4 mr-2" />
          重试失败
        </Button>
      </div>
      
      {/* 搜索和筛选 */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="搜索文件..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="uploading">上传中</TabsTrigger>
            <TabsTrigger value="error">失败</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* 文件列表 */}
      <div className="space-y-2">
        {filteredFiles.map(file => (
          <FileItem key={file.id} file={file} />
        ))}
      </div>
      
      {/* 底部操作 */}
      <div className="flex justify-end">
        <Button variant="outline">
          管理本组文件
        </Button>
      </div>
    </div>
  );
};
```

#### 3.4.5 文件项组件
**组件名称**：`FileItem`

**功能**：
- 显示文件名、大小、进度
- 显示上传速度和剩余时间
- 控制按钮（暂停/恢复/取消/重试）
- 错误提示

**样式规范**：
```typescript
<Card className="p-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3 flex-1">
      <FileIcon type={file.file.type} className="h-5 w-5" />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{file.file.name}</p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
          <span>{formatBytes(file.totalSize)}</span>
          {file.status === 'uploading' && (
            <>
              <span>{formatBytes(file.speed)}/s</span>
              <span>⏱ {formatDuration(file.remainingTime)}</span>
            </>
          )}
          {file.status === 'error' && (
            <span className="text-destructive">⚠ {file.error}</span>
          )}
        </div>
        {file.status !== 'done' && file.status !== 'error' && (
          <Progress value={file.progress} className="h-1 mt-2" />
        )}
      </div>
    </div>
    <div className="flex gap-2">
      {file.status === 'uploading' && (
        <Button size="icon" variant="ghost" onClick={() => onPause(file.id)}>
          <Pause className="h-4 w-4" />
        </Button>
      )}
      {file.status === 'paused' && (
        <Button size="icon" variant="ghost" onClick={() => onResume(file.id)}>
          <Play className="h-4 w-4" />
        </Button>
      )}
      {file.status === 'error' && (
        <Button size="icon" variant="ghost" onClick={() => onRetry(file.id)}>
          <RotateCw className="h-4 w-4" />
        </Button>
      )}
      {file.status !== 'done' && (
        <Button size="icon" variant="ghost" onClick={() => onRemove(file.id)}>
          <X className="h-4 w-4" />
        </Button>
      )}
      {file.status === 'done' && (
        <CheckCircle2 className="h-5 w-5 text-green-500" />
      )}
    </div>
  </div>
</Card>
```

#### 3.4.6 拖拽上传区组件
**组件名称**：`DropZone`

**功能**：
- 支持拖拽文件和文件夹
- 拖拽时高亮显示
- 显示已选择文件统计
- 点击选择文件/文件夹

**技术实现**：
```typescript
const DropZone = ({ onFilesSelected }: { onFilesSelected: (files: File[]) => void }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const items = Array.from(e.dataTransfer.items);
    const files: File[] = [];
    
    for (const item of items) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          await traverseFileTree(entry, files);
        }
      }
    }
    
    setSelectedFiles(files);
    onFilesSelected(files);
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    onFilesSelected(files);
  };
  
  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-xl p-12 text-center transition-colors",
        dragActive 
          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10" 
          : "border-zinc-300 dark:border-zinc-700"
      )}
      onDragEnter={() => setDragActive(true)}
      onDragLeave={() => setDragActive(false)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <p className="text-lg font-medium mb-2">拖拽文件或文件夹到这里</p>
      <p className="text-sm text-muted-foreground mb-4">
        支持 JPG、PNG、GIF、MP4、MOV 等格式
      </p>
      <div className="flex gap-2 justify-center">
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          <File className="h-4 w-4 mr-2" />
          选择文件
        </Button>
        <Button variant="outline" onClick={() => folderInputRef.current?.click()}>
          <Folder className="h-4 w-4 mr-2" />
          选择文件夹
        </Button>
      </div>
      {selectedFiles.length > 0 && (
        <div className="mt-4 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
          <p className="text-sm font-medium">
            已选择: {selectedFiles.length} 个文件 
            ({formatBytes(selectedFiles.reduce((sum, f) => sum + f.size, 0))})
          </p>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={folderInputRef}
        type="file"
        webkitdirectory=""
        directory=""
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
};

// 递归遍历文件夹
async function traverseFileTree(entry: any, files: File[]) {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve) => {
      entry.file(resolve);
    });
    files.push(file);
  } else if (entry.isDirectory) {
    const reader = entry.createReader();
    const entries = await new Promise<any[]>((resolve) => {
      reader.readEntries(resolve);
    });
    for (const childEntry of entries) {
      await traverseFileTree(childEntry, files);
    }
  }
}
```

### 3.5 上传控制逻辑

#### 3.5.1 任务队列管理
```typescript
class TaskQueueManager {
  private tasks: Map<string, UploadTask> = new Map();
  private activeTaskId: string | null = null;
  
  addTask(task: UploadTask) {
    this.tasks.set(task.id, task);
    this.processQueue();
  }
  
  private async processQueue() {
    // 如果有任务正在上传，不启动新任务
    if (this.activeTaskId) return;
    
    // 找到第一个排队中的任务
    const queuedTask = Array.from(this.tasks.values())
      .find(t => t.status === 'queued');
    
    if (queuedTask) {
      this.activeTaskId = queuedTask.id;
      await this.uploadTask(queuedTask);
      this.activeTaskId = null;
      this.processQueue(); // 处理下一个任务
    }
  }
  
  private async uploadTask(task: UploadTask) {
    task.status = 'uploading';
    task.startedAt = new Date();
    
    const fileQueue = new FileUploadQueue(task.config.concurrency);
    
    for (const file of task.files) {
      fileQueue.enqueue(file);
    }
    
    await fileQueue.waitForCompletion();
    
    task.status = 'completed';
    task.completedAt = new Date();
  }
  
  pauseTask(taskId: string) {
    const task = this.tasks.get(taskId);
    if (task && task.status === 'uploading') {
      task.status = 'paused';
      task.files.forEach(f => {
        if (f.status === 'uploading' || f.status === 'waiting') {
          f.status = 'paused';
        }
      });
    }
  }
  
  resumeTask(taskId: string) {
    const task = this.tasks.get(taskId);
    if (task && task.status === 'paused') {
      task.status = 'queued';
      task.files.forEach(f => {
        if (f.status === 'paused') {
          f.status = 'waiting';
        }
      });
      this.processQueue();
    }
  }
  
  cancelTask(taskId: string) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = 'failed';
      task.files.forEach(f => {
        if (f.status !== 'done') {
          f.status = 'error';
          f.error = '任务已取消';
        }
      });
    }
  }
}
```

#### 3.5.2 文件并发上传
```typescript
class FileUploadQueue {
  private maxConcurrent: number;
  private activeUploads = 0;
  private queue: UploadFile[] = [];
  private completionPromise: Promise<void>;
  private resolveCompletion!: () => void;
  
  constructor(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent;
    this.completionPromise = new Promise(resolve => {
      this.resolveCompletion = resolve;
    });
  }
  
  enqueue(file: UploadFile) {
    this.queue.push(file);
    this.processQueue();
  }
  
  private async processQueue() {
    while (this.queue.length > 0 && this.activeUploads < this.maxConcurrent) {
      const file = this.queue.shift();
      if (file && file.status === 'waiting') {
        this.activeUploads++;
        this.uploadFile(file).finally(() => {
          this.activeUploads--;
          this.processQueue();
          
          // 检查是否所有文件都已处理
          if (this.queue.length === 0 && this.activeUploads === 0) {
            this.resolveCompletion();
          }
        });
      }
    }
  }
  
  private async uploadFile(file: UploadFile) {
    file.status = 'uploading';
    file.startTime = Date.now();
    
    try {
      // 阶段 1: 计算哈希 (0-10%)
      file.phase = 'hashing';
      const hash = await this.calculateHash(file.file, (progress) => {
        file.progress = progress * 10;
      });
      
      // 阶段 2: 上传分片 (10-95%)
      file.phase = 'uploading';
      await this.uploadChunks(file, hash, (progress) => {
        file.progress = 10 + progress * 85;
      });
      
      // 阶段 3: 完成上传 (95-100%)
      file.phase = 'completing';
      await this.completeUpload(file, hash);
      file.progress = 100;
      
      file.status = 'done';
      file.endTime = Date.now();
    } catch (error) {
      file.status = 'error';
      file.error = error instanceof Error ? error.message : '上传失败';
    }
  }
  
  private async calculateHash(
    file: File, 
    onProgress: (progress: number) => void
  ): Promise<string> {
    // 使用 Web Worker 计算哈希
    return new Promise((resolve, reject) => {
      const worker = new Worker('/workers/hash-worker.js');
      worker.postMessage({ file });
      
      worker.onmessage = (e) => {
        if (e.data.type === 'progress') {
          onProgress(e.data.progress);
        } else if (e.data.type === 'complete') {
          resolve(e.data.hash);
          worker.terminate();
        }
      };
      
      worker.onerror = (error) => {
        reject(error);
        worker.terminate();
      };
    });
  }
  
  private async uploadChunks(
    file: UploadFile,
    hash: string,
    onProgress: (progress: number) => void
  ) {
    const chunkSize = 5 * 1024 * 1024; // 5MB
    const chunks = Math.ceil(file.totalSize / chunkSize);
    
    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.totalSize);
      const chunk = file.file.slice(start, end);
      
      await this.uploadChunk(file.taskId, hash, i, chunk);
      
      file.uploadedSize = end;
      onProgress(end / file.totalSize);
      
      // 计算上传速度
      const elapsed = (Date.now() - file.startTime!) / 1000;
      file.speed = file.uploadedSize / elapsed;
    }
  }
  
  private async uploadChunk(
    taskId: string,
    hash: string,
    index: number,
    chunk: Blob
  ) {
    const formData = new FormData();
    formData.append('taskId', taskId);
    formData.append('hash', hash);
    formData.append('index', index.toString());
    formData.append('chunk', chunk);
    
    const response = await fetch('/api/upload/chunk', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('分片上传失败');
    }
  }
  
  private async completeUpload(file: UploadFile, hash: string) {
    const response = await fetch('/api/upload/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: file.taskId,
        hash,
        filename: file.file.name,
        size: file.totalSize,
      }),
    });
    
    if (!response.ok) {
      throw new Error('完成上传失败');
    }
  }
  
  waitForCompletion(): Promise<void> {
    return this.completionPromise;
  }
}
```

#### 3.5.3 断点续传
```typescript
// 保存上传进度到 IndexedDB
const saveProgress = async (file: UploadFile) => {
  const db = await openDB('upload-progress', 1, {
    upgrade(db) {
      db.createObjectStore('files', { keyPath: 'id' });
    },
  });
  
  await db.put('files', {
    id: file.id,
    taskId: file.taskId,
    uploadedSize: file.uploadedSize,
    uploadedChunks: file.uploadedChunks,
    hash: file.hash,
  });
};

// 恢复上传
const resumeUpload = async (file: UploadFile) => {
  const db = await openDB('upload-progress', 1);
  const saved = await db.get('files', file.id);
  
  if (saved) {
    file.uploadedSize = saved.uploadedSize;
    file.uploadedChunks = saved.uploadedChunks;
    file.hash = saved.hash;
    
    // 从上次的分片继续上传
    return uploadFromChunk(file, saved.uploadedChunks.length);
  }
};
```

#### 3.5.4 错误重试
```typescript
const uploadWithRetry = async (
  file: UploadFile,
  maxRetries = 3
): Promise<void> => {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await uploadFile(file);
      return;
    } catch (error) {
      retries++;
      
      if (retries >= maxRetries) {
        throw error;
      }
      
      // 指数退避
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, retries) * 1000)
      );
      
      toast.info(`重试上传 (${retries}/${maxRetries})`, {
        description: file.file.name,
      });
    }
  }
};
```

#### 3.5.5 网络状态监听
```typescript
const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('网络已恢复', {
        description: '是否继续上传？',
        action: {
          label: '继续',
          onClick: () => resumeAllTasks(),
        },
      });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      pauseAllTasks();
      toast.warning('网络已断开', {
        description: '上传已自动暂停',
      });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOnline;
};
```

### 3.6 分片上传优化

#### 3.6.1 进度计算优化
```typescript
type UploadPhase = 'hashing' | 'uploading' | 'completing';

const calculateProgress = (
  phase: UploadPhase,
  phaseProgress: number
): number => {
  switch (phase) {
    case 'hashing':
      return phaseProgress * 0.1; // 0-10%
    case 'uploading':
      return 10 + phaseProgress * 0.85; // 10-95%
    case 'completing':
      return 95 + phaseProgress * 0.05; // 95-100%
  }
};

// 使用
const [phase, setPhase] = useState<UploadPhase>('hashing');
const [phaseProgress, setPhaseProgress] = useState(0);
const overallProgress = calculateProgress(phase, phaseProgress);
```

#### 3.6.2 阶段文本显示
```typescript
const getPhaseText = (phase: UploadPhase, t: any) => {
  switch (phase) {
    case 'hashing':
      return t('upload.hashing'); // "计算哈希中"
    case 'uploading':
      return t('upload.uploading'); // "上传中"
    case 'completing':
      return t('upload.completing'); // "完成中"
  }
};
```

#### 3.6.3 Web Worker 哈希计算
```typescript
// /public/workers/hash-worker.js
self.onmessage = async (e) => {
  const { file } = e.data;
  const chunkSize = 2 * 1024 * 1024; // 2MB
  const chunks = Math.ceil(file.size / chunkSize);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  self.postMessage({ type: 'complete', hash });
};
```

### 3.7 交互流程

#### 3.7.1 创建任务流程
1. 用户点击"新建上传任务" → 进入创建页面
2. 填写任务名称、选择存储、选择分类
3. 拖拽或选择文件/文件夹
4. 配置高级选项（可选）
5. 点击"开始上传" → 创建任务并返回任务列表
6. 任务自动开始上传

#### 3.7.2 任务管理流程
1. 在任务列表查看所有任务
2. 点击任务卡片 → 展开/折叠任务详情
3. 点击"查看"按钮 → 进入任务详情页面
4. 在详情页面管理单个文件
5. 使用搜索和筛选快速定位文件

#### 3.7.3 暂停/恢复流程
1. 任务级别：点击任务卡片的暂停按钮 → 暂停整个任务
2. 文件级别：在详情页点击文件的暂停按钮 → 暂停单个文件
3. 全局级别：点击"暂停全部" → 暂停所有上传中的任务
4. 恢复操作同理

#### 3.7.4 错误处理流程
1. 文件上传失败 → 标记为失败状态，显示错误信息
2. 用户可以点击"重试"按钮重新上传单个文件
3. 用户可以点击"重试失败"按钮批量重试所有失败文件
4. 网络断开 → 自动暂停所有上传
5. 网络恢复 → 提示用户是否继续上传

### 3.8 性能优化

#### 3.8.1 虚拟滚动
```typescript
// 任务列表虚拟滚动
import { useVirtualizer } from '@tanstack/react-virtual';

const TaskList = ({ tasks }: { tasks: UploadTask[] }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // 任务卡片高度
    overscan: 3,
  });
  
  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
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
            <TaskCard task={tasks[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

#### 3.8.2 进度更新节流
```typescript
// 节流进度更新，避免频繁渲染
const throttledUpdateProgress = useCallback(
  throttle((fileId: string, progress: number) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, progress } : file
    ));
  }, 100), // 100ms 更新一次
  []
);
```

#### 3.8.3 任务元数据计算优化
```typescript
// 使用 useMemo 缓存计算结果
const taskMetadata = useMemo(() => {
  const totalFiles = task.files.length;
  const totalSize = task.files.reduce((sum, f) => sum + f.totalSize, 0);
  const uploadedFiles = task.files.filter(f => f.status === 'done').length;
  const uploadedSize = task.files.reduce((sum, f) => sum + f.uploadedSize, 0);
  const failedFiles = task.files.filter(f => f.status === 'error').length;
  const progress = totalSize > 0 ? (uploadedSize / totalSize) * 100 : 0;
  
  const uploadingFiles = task.files.filter(f => f.status === 'uploading');
  const speed = uploadingFiles.reduce((sum, f) => sum + (f.speed || 0), 0);
  const remainingSize = totalSize - uploadedSize;
  const remainingTime = speed > 0 ? remainingSize / speed : 0;
  
  return {
    totalFiles,
    totalSize,
    uploadedFiles,
    uploadedSize,
    failedFiles,
    progress: Math.round(progress),
    speed,
    remainingTime,
  };
}, [task.files]);
```

#### 3.8.4 IndexedDB 存储优化
```typescript
// 使用 IndexedDB 存储任务和文件信息
import { openDB } from 'idb';

const db = await openDB('upload-center', 1, {
  upgrade(db) {
    // 任务存储
    const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
    taskStore.createIndex('status', 'status');
    taskStore.createIndex('createdAt', 'createdAt');
    
    // 文件存储
    const fileStore = db.createObjectStore('files', { keyPath: 'id' });
    fileStore.createIndex('taskId', 'taskId');
    fileStore.createIndex('status', 'status');
  },
});

// 保存任务
const saveTask = async (task: UploadTask) => {
  await db.put('tasks', task);
};

// 查询任务
const getTasks = async (status?: TaskStatus) => {
  if (status) {
    return await db.getAllFromIndex('tasks', 'status', status);
  }
  return await db.getAll('tasks');
};
```

### 3.9 国际化支持

#### 3.9.1 中文文案
```json
// messages/zh-CN.json
{
  "dashboard": {
    "upload": {
      "title": "上传中心",
      "createTask": "新建上传任务",
      "taskName": "任务名称",
      "targetStorage": "目标存储",
      "fileCategory": "文件分类",
      "dragHere": "拖拽文件或文件夹到这里",
      "selectFiles": "选择文件",
      "selectFolder": "选择文件夹",
      "advancedConfig": "高级配置",
      "concurrency": "并发上传数",
      "duplicateHandling": "重复文件处理",
      "skip": "跳过",
      "rename": "重命名",
      "overwrite": "覆盖",
      "postProcessing": "后处理插件",
      "autoTag": "AI 自动标签",
      "videoTranscode": "视频转码",
      "imageCompress": "图片压缩",
      "startUpload": "开始上传",
      "stats": {
        "uploading": "正在上传",
        "queued": "等待中",
        "speed": "传输速度",
        "completed": "已完成"
      },
      "status": {
        "uploading": "正在上传",
        "queued": "等待中",
        "completed": "已完成",
        "paused": "已暂停",
        "failed": "失败"
      },
      "actions": {
        "pause": "暂停",
        "resume": "恢复",
        "cancel": "取消",
        "retry": "重试",
        "view": "查看",
        "pauseAll": "暂停全部",
        "cancelTask": "取消任务",
        "retryFailed": "重试失败",
        "manageFiles": "管理本组文件"
      },
      "phase": {
        "hashing": "计算哈希中",
        "uploading": "上传中",
        "completing": "完成中"
      },
      "messages": {
        "taskCreated": "任务创建成功",
        "uploadComplete": "上传完成",
        "uploadFailed": "上传失败",
        "networkOffline": "网络已断开，上传已自动暂停",
        "networkOnline": "网络已恢复，是否继续上传？"
      }
    }
  }
}
```

#### 3.9.2 英文文案
```json
// messages/en.json
{
  "dashboard": {
    "upload": {
      "title": "Upload Center",
      "createTask": "New Upload Task",
      "taskName": "Task Name",
      "targetStorage": "Target Storage",
      "fileCategory": "File Category",
      "dragHere": "Drag files or folders here",
      "selectFiles": "Select Files",
      "selectFolder": "Select Folder",
      "advancedConfig": "Advanced Config",
      "concurrency": "Concurrent Uploads",
      "duplicateHandling": "Duplicate Handling",
      "skip": "Skip",
      "rename": "Rename",
      "overwrite": "Overwrite",
      "postProcessing": "Post Processing",
      "autoTag": "AI Auto Tag",
      "videoTranscode": "Video Transcode",
      "imageCompress": "Image Compress",
      "startUpload": "Start Upload",
      "stats": {
        "uploading": "Uploading",
        "queued": "Queued",
        "speed": "Speed",
        "completed": "Completed"
      },
      "status": {
        "uploading": "Uploading",
        "queued": "Queued",
        "completed": "Completed",
        "paused": "Paused",
        "failed": "Failed"
      },
      "actions": {
        "pause": "Pause",
        "resume": "Resume",
        "cancel": "Cancel",
        "retry": "Retry",
        "view": "View",
        "pauseAll": "Pause All",
        "cancelTask": "Cancel Task",
        "retryFailed": "Retry Failed",
        "manageFiles": "Manage Files"
      },
      "phase": {
        "hashing": "Hashing",
        "uploading": "Uploading",
        "completing": "Completing"
      },
      "messages": {
        "taskCreated": "Task created successfully",
        "uploadComplete": "Upload complete",
        "uploadFailed": "Upload failed",
        "networkOffline": "Network offline, uploads paused",
        "networkOnline": "Network online, resume uploads?"
      }
    }
  }
}
```

---

## 4. 照片详情模态框优化

### 4.1 编辑模式设计

#### 4.1.1 模式切换
```
┌─────────────────────────────────────────────────────────┐
│ [✕]                                        [编辑] [查看] │ ← 模式切换按钮
├─────────────────────────────────────────────────────────┤
│                                                          │
│                    [照片显示区域]                        │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ Frame 模式下的元数据区域                                 │
│                                                          │
│ 查看模式：                                               │
│   Title: Sunset at Beach                                │
│   Author: John Doe                                      │
│   Date: 2024-03-15                                      │
│                                                          │
│ 编辑模式：                                               │
│   Title: [Sunset at Beach        ]  ← 有边框和背景      │
│   Author: [John Doe              ]                      │
│   Date: [2024-03-15              ]                      │
│   [保存] [取消]                                          │
└─────────────────────────────────────────────────────────┘
```

#### 4.1.2 编辑状态管理
```typescript
const [isEditing, setIsEditing] = useState(false);
const [hasChanges, setHasChanges] = useState(false);
const [editData, setEditData] = useState({
  title: item.title,
  author: item.author,
  dateShot: item.dateShot,
});

// 检测变更
useEffect(() => {
  const changed = 
    editData.title !== item.title ||
    editData.author !== item.author ||
    editData.dateShot !== item.dateShot;
  setHasChanges(changed);
}, [editData, item]);

// 切换照片时提示保存
const handlePhotoChange = () => {
  if (hasChanges) {
    if (confirm('有未保存的修改，是否保存？')) {
      handleSave();
    }
  }
  // 切换照片
};
```


### 4.2 导航优化

#### 4.2.1 缩略图滚动优化
```typescript
// 自动滚动到当前照片
useEffect(() => {
  if (thumbnailRef.current && selectedId) {
    const selectedThumb = thumbnailRef.current.querySelector(
      `[data-id="${selectedId}"]`
    );
    if (selectedThumb) {
      selectedThumb.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }
}, [selectedId]);

// 拖拽滚动
const handleMouseDown = (e: React.MouseEvent) => {
  setIsDragging(true);
  setStartX(e.pageX - scrollRef.current!.offsetLeft);
  setScrollLeft(scrollRef.current!.scrollLeft);
};

const handleMouseMove = (e: React.MouseEvent) => {
  if (!isDragging) return;
  e.preventDefault();
  const x = e.pageX - scrollRef.current!.offsetLeft;
  const walk = (x - startX) * 2; // 滚动速度
  scrollRef.current!.scrollLeft = scrollLeft - walk;
};
```

#### 4.2.2 键盘快捷键
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        onPrev();
        break;
      case 'ArrowRight':
        onNext();
        break;
      case 'Escape':
        onClose();
        break;
      case 'Home':
        onFirst();
        break;
      case 'End':
        onLast();
        break;
      case 's':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleSave();
        }
        break;
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [onPrev, onNext, onClose, handleSave]);
```

#### 4.2.3 触摸手势（移动端）
```typescript
import { useSwipeable } from 'react-swipeable';

const handlers = useSwipeable({
  onSwipedLeft: () => onNext(),
  onSwipedRight: () => onPrev(),
  onSwipedDown: () => onClose(),
  preventScrollOnSwipe: true,
  trackMouse: false,
});

<div {...handlers}>
  {/* 照片内容 */}
</div>
```

### 4.3 动画优化

#### 4.3.1 切换动画
```typescript
// 使用 Framer Motion
<AnimatePresence mode="wait" custom={direction}>
  <motion.div
    key={item.id}
    custom={direction}
    variants={{
      enter: (dir: number) => ({
        x: dir > 0 ? 100 : -100,
        opacity: 0,
      }),
      center: {
        x: 0,
        opacity: 1,
      },
      exit: (dir: number) => ({
        x: dir > 0 ? -100 : 100,
        opacity: 0,
      }),
    }}
    initial="enter"
    animate="center"
    exit="exit"
    transition={{
      x: { type: 'spring', stiffness: 300, damping: 30 },
      opacity: { duration: 0.2 },
    }}
  >
    {/* 照片内容 */}
  </motion.div>
</AnimatePresence>
```

---

## 5. 错误处理统一化

### 5.1 Toast 通知系统

#### 5.1.1 组件设计
**组件名称**：`Toast` / `Toaster`

**功能**：
- 4 种类型：success、error、warning、info
- 自动消失（可配置）
- 支持操作按钮
- 支持堆叠显示
- 支持关闭按钮

**技术实现**：
```typescript
// 使用 Sonner 或 React Hot Toast
import { toast } from 'sonner';

// 成功提示
toast.success('上传成功', {
  description: '已成功上传 10 个文件',
  duration: 3000,
});

// 错误提示
toast.error('上传失败', {
  description: '网络连接失败，请重试',
  action: {
    label: '重试',
    onClick: () => retryUpload(),
  },
});

// 加载提示
const toastId = toast.loading('正在上传...');
// 更新
toast.success('上传完成', { id: toastId });
```

#### 5.1.2 样式规范
```typescript
// Toaster 配置
<Toaster
  position="top-right"
  toastOptions={{
    className: 'rounded-xl border border-zinc-200 dark:border-zinc-800',
    style: {
      background: 'hsl(var(--background))',
      color: 'hsl(var(--foreground))',
    },
  }}
/>
```

### 5.2 错误边界

#### 5.2.1 全局错误边界
```typescript
class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Global error:', error, errorInfo);
    // 可选：上报错误
    reportError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">出错了</h1>
            <p className="text-muted-foreground">
              {this.state.error?.message || '发生了未知错误'}
            </p>
            <Button onClick={() => window.location.reload()}>
              重新加载
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

#### 5.2.2 局部错误边界
```typescript
// 用于包裹可能出错的组件
<ErrorBoundary
  fallback={<div>加载失败，请刷新页面</div>}
  onError={(error) => console.error(error)}
>
  <MediaLibrary />
</ErrorBoundary>
```

### 5.3 网络错误处理

#### 5.3.1 统一请求封装
```typescript
class ApiClient {
  private async request<T>(
    url: string,
    options?: RequestInit
  ): Promise<T> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
        });

        if (!response.ok) {
          await this.handleHttpError(response);
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries - 1) {
          await this.delay(Math.pow(2, i) * 1000);
        }
      }
    }

    throw lastError;
  }

  private async handleHttpError(response: Response) {
    switch (response.status) {
      case 401:
        // 跳转登录
        window.location.href = '/login';
        break;
      case 403:
        toast.error('权限不足');
        break;
      case 404:
        toast.error('资源不存在');
        break;
      case 500:
        toast.error('服务器错误', {
          action: {
            label: '重试',
            onClick: () => window.location.reload(),
          },
        });
        break;
      default:
        const data = await response.json().catch(() => ({}));
        toast.error(data.message || '请求失败');
    }
    throw new Error(`HTTP ${response.status}`);
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const apiClient = new ApiClient();
```

---

## 6. 加载状态优化

### 6.1 全局加载进度条

#### 6.1.1 实现方案
```typescript
// 使用 NProgress 或 Next.js TopLoader
import { AppProgressBar as ProgressBar } from 'next-nprogress-bar';

// 在 layout.tsx 中
<ProgressBar
  height="2px"
  color="#6366f1"
  options={{ showSpinner: false }}
  shallowRouting
/>
```

### 6.2 局部加载状态

#### 6.2.1 Spinner 组件
```typescript
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <Loader2 className={cn('animate-spin', sizeClasses[size])} />
  );
}
```

#### 6.2.2 按钮加载状态
```typescript
<Button disabled={isLoading}>
  {isLoading && <Spinner size="sm" className="mr-2" />}
  {isLoading ? '上传中...' : '上传'}
</Button>
```

### 6.3 骨架屏优化

#### 6.3.1 画廊骨架屏
```typescript
export function GallerySkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className={cn('grid gap-4', {
      'grid-cols-2 md:grid-cols-3 lg:grid-cols-4': columns === 4,
      'grid-cols-2 md:grid-cols-4 lg:grid-cols-6': columns === 6,
    })}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="aspect-square rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse"
        />
      ))}
    </div>
  );
}
```

#### 6.3.2 媒体库骨架屏
```typescript
export function MediaLibrarySkeleton() {
  return (
    <div className="space-y-6">
      {/* 筛选栏骨架 */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      
      {/* 网格骨架 */}
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: 24 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    </div>
  );
}
```

---

## 7. 响应式设计改进

### 7.1 断点定义
```typescript
const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};
```

### 7.2 移动端优化

#### 7.2.1 筛选抽屉
```typescript
// 移动端使用 Sheet 组件
<Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
  <SheetTrigger asChild>
    <Button variant="outline" size="sm">
      <Filter className="h-4 w-4 mr-2" />
      筛选
    </Button>
  </SheetTrigger>
  <SheetContent side="bottom" className="h-[80vh]">
    <SheetHeader>
      <SheetTitle>筛选选项</SheetTitle>
    </SheetHeader>
    <div className="py-4">
      {/* 筛选内容 */}
    </div>
  </SheetContent>
</Sheet>
```

#### 7.2.2 批量操作底部栏
```typescript
// 移动端批量操作使用底部固定栏
{selectedCount > 0 && (
  <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-4 md:hidden">
    <div className="flex items-center justify-between">
      <span className="text-sm">已选择 {selectedCount} 项</span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline">
          <Eye className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline">
          <Download className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
)}
```

### 7.3 触摸优化

#### 7.3.1 触摸目标尺寸
```typescript
// 确保所有可点击元素至少 44x44px
const touchTargetClasses = 'min-h-[44px] min-w-[44px]';
```

#### 7.3.2 滑动手势
```typescript
// 使用 react-swipeable
const swipeHandlers = useSwipeable({
  onSwipedLeft: () => handleNext(),
  onSwipedRight: () => handlePrev(),
  preventScrollOnSwipe: true,
  trackTouch: true,
  trackMouse: false,
});
```

---

## 8. 无障碍性改进

### 8.1 键盘导航

#### 8.1.1 焦点管理
```typescript
// 模态框打开时聚焦第一个可交互元素
useEffect(() => {
  if (isOpen) {
    const firstFocusable = modalRef.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    (firstFocusable as HTMLElement)?.focus();
  }
}, [isOpen]);

// 焦点陷阱
useFocusTrap(modalRef, isOpen);
```

#### 8.1.2 快捷键提示
```typescript
// 显示快捷键帮助
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="icon">
      <Keyboard className="h-4 w-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    <div className="space-y-2 text-xs">
      <div><kbd>←</kbd> 上一张</div>
      <div><kbd>→</kbd> 下一张</div>
      <div><kbd>ESC</kbd> 关闭</div>
      <div><kbd>Ctrl+S</kbd> 保存</div>
    </div>
  </TooltipContent>
</Tooltip>
```

### 8.2 ARIA 属性

#### 8.2.1 常用 ARIA 属性
```typescript
// 按钮
<button
  aria-label="关闭对话框"
  aria-pressed={isActive}
  aria-disabled={isDisabled}
>
  <X />
</button>

// 加载状态
<div aria-busy={isLoading} aria-live="polite">
  {isLoading ? <Spinner /> : content}
</div>

// 模态框
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <h2 id="dialog-title">标题</h2>
  <p id="dialog-description">描述</p>
</div>

// 表单
<input
  aria-label="搜索媒体"
  aria-describedby="search-help"
  aria-invalid={hasError}
/>
<span id="search-help">输入文件名或标签搜索</span>
```

### 8.3 颜色对比度

#### 8.3.1 对比度检查
```typescript
// 确保文本颜色对比度 ≥ 4.5:1
const textColors = {
  primary: 'text-zinc-900 dark:text-zinc-100', // 对比度 > 7:1
  secondary: 'text-zinc-600 dark:text-zinc-400', // 对比度 > 4.5:1
  muted: 'text-zinc-500 dark:text-zinc-500', // 对比度 = 4.5:1
};
```

---

## 9. 性能优化策略

### 9.1 代码分割
```typescript
// 动态导入大组件
const MediaLibrary = dynamic(() => import('@/components/media-library'), {
  loading: () => <MediaLibrarySkeleton />,
  ssr: false,
});

const UploadCenter = dynamic(() => import('@/components/upload-center'), {
  loading: () => <Spinner />,
});
```

### 9.2 图片优化
```typescript
// 使用 Next.js Image 组件
<Image
  src={item.src}
  alt={item.title}
  width={400}
  height={300}
  placeholder="blur"
  blurDataURL={item.blurHash}
  loading="lazy"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

### 9.3 虚拟滚动
```typescript
// 使用 @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 200,
  overscan: 5,
});
```

### 9.4 防抖和节流
```typescript
// 搜索防抖
const debouncedSearch = useDebouncedCallback(
  (value: string) => {
    performSearch(value);
  },
  300
);

// 滚动节流
const throttledScroll = useThrottledCallback(
  () => {
    handleScroll();
  },
  100
);
```

---

## 10. 国际化支持

### 10.1 文案管理
```json
// messages/zh-CN.json
{
  "dashboard": {
    "media": {
      "filters": {
        "search": "搜索媒体",
        "category": "存储类型",
        "advanced": "高级筛选",
        "clear": "清除筛选"
      },
      "upload": {
        "title": "上传中心",
        "selectFiles": "选择文件",
        "dragHere": "拖拽文件到这里",
        "uploading": "上传中",
        "completed": "已完成",
        "failed": "失败"
      }
    }
  }
}
```

### 10.2 使用方式
```typescript
import { useTranslations } from 'next-intl';

const t = useTranslations('dashboard.media');

<Button>{t('upload.selectFiles')}</Button>
```

---

## 11. 测试策略

### 11.1 单元测试
```typescript
// 测试筛选逻辑
describe('MediaFilter', () => {
  it('should filter by category', () => {
    const items = [
      { id: 1, category: 'local' },
      { id: 2, category: 's3' },
    ];
    const filtered = filterByCategory(items, 'local');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe(1);
  });
});
```

### 11.2 集成测试
```typescript
// 测试上传流程
describe('Upload Flow', () => {
  it('should upload files successfully', async () => {
    const files = [new File(['content'], 'test.jpg')];
    const { result } = renderHook(() => useUpload());
    
    act(() => {
      result.current.enqueueFiles(files);
    });
    
    await waitFor(() => {
      expect(result.current.items[0].status).toBe('done');
    });
  });
});
```

### 11.3 E2E 测试
```typescript
// 使用 Playwright
test('media library filtering', async ({ page }) => {
  await page.goto('/dashboard/media');
  
  // 点击筛选
  await page.click('[data-testid="filter-local"]');
  
  // 验证结果
  const items = await page.locator('[data-testid="media-item"]').count();
  expect(items).toBeGreaterThan(0);
});
```

---

## 12. 部署和监控

### 12.1 渐进式发布
1. 在测试环境验证所有功能
2. 使用 Feature Flag 控制新功能发布
3. 先发布给 10% 用户
4. 监控错误率和性能指标
5. 逐步扩大到 100% 用户

### 12.2 性能监控
```typescript
// 使用 Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  // 发送到分析服务
  console.log(metric);
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### 12.3 错误监控
```typescript
// 使用 Sentry
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // 过滤敏感信息
    return event;
  },
});
```

---

## 13. 附录

### 13.1 组件清单
- `MediaSearchBar` - 搜索框
- `StorageTypeFilter` - 存储类型筛选
- `AdvancedFilterPanel` - 高级筛选面板
- `FilterChips` - 筛选状态标签
- `UploadQueue` - 上传队列
- `UploadItem` - 上传项
- `OverallProgress` - 整体进度
- `DropZone` - 拖拽上传区
- `Toast` / `Toaster` - 通知系统
- `Spinner` - 加载指示器
- `GallerySkeleton` - 画廊骨架屏
- `MediaLibrarySkeleton` - 媒体库骨架屏

### 13.2 工具函数清单
- `useDebounce` - 防抖 Hook
- `useThrottle` - 节流 Hook
- `useFocusTrap` - 焦点陷阱 Hook
- `useVirtualizer` - 虚拟滚动 Hook
- `calculateProgress` - 进度计算
- `formatBytes` - 文件大小格式化
- `formatDuration` - 时间格式化

### 13.3 API 清单
- `GET /api/media/search` - 搜索媒体
- `POST /api/upload/init` - 初始化上传
- `POST /api/upload/chunk` - 上传分片
- `POST /api/upload/complete` - 完成上传
- `PUT /api/media/:id` - 更新媒体信息
- `DELETE /api/media/:id` - 删除媒体

---

**设计文档版本**：1.0  
**最后更新**：2026-04-07  
**负责人**：Kiro AI Assistant

