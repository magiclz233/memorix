# Memorix Project: Front-End UI Revamp (Lumina Design System & Theme Support)

## 1. 项目目标 (Objective)

我们将对 **Memorix** 项目的前台页面 (`app/(front)`) 进行彻底的视觉重构。 目标是实现 **"Lumina" 设计语言**，并确保 **前台与后台拥有统一的明暗色模式切换体验**。

**核心要求**：

1. **视觉风格**：融合沉浸式光影 (Cyberpunk/Aurora) 与极简杂志排版 (Editorial)。
2. **双模适配 (Theme Aware)**：
   - **Light Mode (默认)**：清爽、高雅、类似画廊的留白设计 (White/Zinc-50)。文字深灰，阴影柔和。
   - **Dark Mode**：深邃、科技感、霓虹光晕 (Black/Zinc-950)。文字纯白，发光边框。
   - **切换逻辑**：使用 `next-themes`，默认设置为 `system` 或 `light`，状态需全站同步。
3. **响应式**：完美适配移动端和桌面端。

## 2. 技术栈 (Tech Stack)

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + `tailwindcss-animate`
- **Components**: Shadcn UI (基础组件), Lucide React (图标)
- **Theme**: `next-themes` (必须使用 `dark:` 修饰符适配所有组件)
- **Animation**: `framer-motion` (推荐) 或 CSS Keyframes

## 3. 全局主题配置 (Global Theme Setup)

**重要**：请首先检查 `app/layout.tsx` (Root Layout)，确保包含 `<ThemeProvider>`。

- Attribute: `class`
- DefaultTheme: `light`
- EnableSystem: `true`

## 4. 视觉基础组件 (Visual Foundation)

请在 `components/ui/front` 目录下创建/更新以下核心组件，**务必支持双色模式**：

### A. 全局背景 (`FrontBackground.tsx`)

- **功能**：包裹前台页面的背景层，位于 `app/(front)/layout.tsx` 最外层。
- **样式规范**：
  - **Light Mode**:
    - 底色：`bg-zinc-50` 或 `bg-white`。
    - 纹理：极淡的黑色点阵 (`bg-[radial-gradient(#00000011_1px,transparent_1px)]`)。
    - 光斑：角落仅保留极淡的蓝色/紫色晕染，避免显得“脏”。
  - **Dark Mode**:
    - 底色：`bg-black` 或 `bg-[#050505]`。
    - 纹理：白色微弱点阵 (`bg-[radial-gradient(#ffffff15_1px,transparent_1px)]`)。
    - 光斑：强烈的极光色（靛青、洋红）流动光斑 (`animate-pulse`)。

### B. 聚光灯卡片 (`SpotlightCard.tsx`)

- **交互**：鼠标移动时，卡片表面有圆形光晕跟随。
- **样式规范**：
  - **通用**：圆角 `rounded-3xl`，`overflow-hidden`，`relative`。
  - **Light Mode**:
    - 背景：白色半透明 `bg-white/80 backdrop-blur-md`。
    - 边框：极细灰线 `border-zinc-200`。
    - 光晕颜色：`rgba(0, 0, 0, 0.05)` (淡灰色光晕)。
    - 阴影：`hover:shadow-xl shadow-black/5`。
  - **Dark Mode**:
    - 背景：黑色磨砂 `dark:bg-zinc-900/50`。
    - 边框：`dark:border-white/10`。
    - 光晕颜色：`rgba(255, 255, 255, 0.1)` (亮白色光晕)。

### C. 悬浮导航栏 (`FloatingNav.tsx`)

- **位置**：页面顶部 `fixed top-6`，水平居中，`z-50`。
- **样式**：
  - 胶囊形状 `rounded-full`。
  - 背景：`bg-white/70 dark:bg-black/70 backdrop-blur-xl`。
  - 边框：`border border-zinc-200 dark:border-white/10`。
  - 阴影：`shadow-lg`。
- **内容**：
  - 左侧：Logo (LUMINA)。
  - 中间：菜单项 (首页, 画廊, 图集, 视频集, 关于)。选中态需有背景高亮（Light: 浅灰, Dark: 浅白）。
  - 右侧：
    - 搜索按钮。
    - **主题切换按钮 (`ModeToggle`)**：直接复用 `components/theme-toggle.tsx`。
    - 用户头像/登录按钮。

## 5. 页面模块开发 (Page Implementation)

请重构 `/app/(front)` 下的各个页面：

### 5.1 首页 (`app/(front)/page.tsx`)

**视觉结构**：

1. **Hero Section (首屏)**：
   - **容器**：高度 `h-[85vh]`，圆角 `rounded-[2.5rem]`，边距留白。
   - **内容**：
     - 背景：高质量摄影图（带视差滚动效果）。
     - 遮罩：Light Mode 下使用浅色渐变遮罩，Dark Mode 使用深色遮罩。
     - 文字：超大标题 "LUMINA VISION"，混合模式 `mix-blend-overlay` (Dark) 或 `text-zinc-900` (Light)。
2. **精选图集 (Featured Collections)**：
   - 使用 `SpotlightCard` 展示 3 个精选集。
   - Light Mode 下文字为深色，Dark Mode 为浅色。

### 5.2 画廊页面 (`app/(front)/gallery/page.tsx`)

**功能**：展示所有资源的统一入口。

- **筛选栏 (Filter Bar)**：
  - 悬浮胶囊样式，位于内容上方。
  - 样式：`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800`。
- **网格视图 (Masonry)**：
  - 图片和视频混排。
  - 卡片背景：`bg-zinc-100 dark:bg-zinc-900`。
  - **视频标识**：右上角播放图标，Dark Mode 下图标发光。

### 5.3 集合页面 (`app/(front)/photo-collections` & `video-collections`)

**重构目标**：实体质感。

- **图集卡片**：
  - 实现“堆叠”效果：主图下方有 1-2 层伪元素，模拟一叠照片。
  - Light Mode：堆叠层有清晰的投影 `shadow-md`。
- **视频集卡片**：
  - 16:9 电影宽幅封面。
  - 底部元信息栏：`bg-white/90 dark:bg-black/90`。

### 5.4 关于页面 (`app/(front)/about/page.tsx`)

**视觉风格**：极简杂志排版。

- **排版**：大留白。
- **字体**：Light Mode 下使用深灰色衬线体或无衬线细体，营造文艺感。
- **Bento Grid**：展示设备清单，格子背景需适配 Light/Dark (`bg-zinc-50 dark:bg-zinc-900/50`)。

## 6. 样式细节 (Design Tokens)

请严格遵循以下 Tailwind 类名组合以保证双模适配：

- **文字颜色**:
  - 主标题: `text-zinc-900 dark:text-white`
  - 副标题/正文: `text-zinc-500 dark:text-zinc-400`
  - 强调色: `text-indigo-600 dark:text-indigo-400`
- **背景颜色**:
  - 页面底色: `bg-zinc-50 dark:bg-black`
  - 卡片底色: `bg-white dark:bg-zinc-900`
- **边框**:
  - 通用: `border-zinc-200 dark:border-zinc-800`
- **阴影**:
  - Light: `shadow-lg shadow-zinc-200/50` (暖色调阴影)
  - Dark: `shadow-2xl shadow-black/50` (深邃阴影)

## 7. 开发步骤 (Execution Steps)

1. **基础组件**:
   - 创建 `components/ui/front/front-background.tsx`。
   - 创建 `components/ui/front/spotlight-card.tsx`。
   - 创建 `components/ui/front/floating-nav.tsx` (集成 `ModeToggle`)。
2. **布局替换**:
   - 修改 `app/(front)/layout.tsx`，引入新的 Background 和 Nav。
3. **页面重写**:
   - 重写 Home, Gallery, Collections, About 页面。
   - 使用 Mock Data 填充，优先确保 UI 在 Light 和 Dark 模式下都完美无瑕。

**特别提示**: 在编写代码时，请始终考虑 `dark:` 变体。如果一个颜色在 Light Mode 下是黑色的，在 Dark Mode 下通常应变为白色（反之亦然）。

## 8. 实施记录（Codex 更新）

### 已完成
- 全局主题：新增 `next-themes` 主题提供器，Root Layout 注入 `<ThemeProvider>`，前台/后台统一主题切换逻辑。
- 视觉基础组件：更新 `FrontBackground`，新增 `SpotlightCard`，新增 `FloatingNav` 并集成 `ModeToggle`。
- 首页：重构 Hero（`h-[85vh]` + 图像背景 + 双色遮罩），替换为 Spotlight 精选卡片布局。
- 画廊：筛选栏改为胶囊悬浮样式，列表改为 Masonry 列布局，媒体卡片补充视频发光标识。
- 图集/视频集：照片集卡片叠层质感，视频集卡片 16:9 封面 + 底部元信息栏。
- 关于页：杂志排版、衬线标题、Bento 设备清单，双色背景适配。

- 布局比例：前台容器宽度调整为 `80vw`，左右约 10% 留白。
- 画廊数据：改为读取数据库已发布文件，使用文件 URL/缩略图展示。
### 仍未完成/需确认
- 目前仅用 CSS `bg-fixed` 近似视差效果，若需更强的视差交互需引入 JS/动画库。
- 搜索按钮仅为视觉占位，未接入实际搜索逻辑。
- 依赖新增 `next-themes`，需在本地执行 `pnpm install` 后验证。
