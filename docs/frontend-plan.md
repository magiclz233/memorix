# 前台改版计划

目标：重建 5 个前台页面(首页/画廊/照片作品集/视频作品集/关于)，支持明暗色模式切换，使用 shadcn/ui + TailwindCSS，并尽量采用 reactbits/magicui/aceternity 的组件与视觉风格(无法拉取时由我提示你手动导入对应组件)。

## 路由
- / (首页)
- /gallery
- /photo-collections
- /video-collections
- /about

## 结构建议
- app/(front)/layout.tsx (前台布局：导航、背景、字体、动效容器、明暗切换)
- app/(front)/page.tsx (首页)
- app/(front)/gallery/page.tsx
- app/(front)/photo-collections/page.tsx
- app/(front)/video-collections/page.tsx
- app/(front)/about/page.tsx
- app/ui/front/** (前台 UI 组件)

## 整体思路
- 统一前台视觉语言：暗色宇宙背景 + 玻璃拟态导航 + 大卡片圆角 + 轻微霓虹高光，全站共享导航/页脚。
- App Router 下把前台页面集中到 app/(front)，共享 layout.tsx 做导航、背景、字体、动效容器。
- 组件分层：页面级组装 + UI 组件(shadcn/ui) + 视觉组件(reactbits/magicui/aceternity 灵感或改造)。
- 数据结构先行：统一 Media/Collection 类型，保证首页/画廊/图集/视频集共用同一数据源与筛选逻辑。
- 交互组件(轮播/筛选)使用 `use client`；页面保持 Server Component 默认模式。
- 明暗色模式：基于全局主题变量 + 切换入口，前台布局提供切换按钮。

## 页面模块明细
### 首页
- Hero 轮播：精选图集 + 视频集(统一 Featured 数据数组)
- 轮播下方：精选视频集、精选图集、画廊亮点(卡片 + “查看全部”)
- 视觉组件：Hero 背景使用 magicui 光晕/渐变叠层 + reactbits 粒子背景
- 卡片交互：aceternity 玻璃卡片或 hover glow 风格

### 画廊
- 顶部筛选：Tabs/Segmented (全部/图片/视频/时间线)
- 内容网格：Masonry 或 Staggered Grid (shadcn Card + 自定义 Grid)
- 交互：点击卡片进入详情(后续可扩展动态路由)

### 图集 / 视频集
- 图集：Collection 卡片(封面 + 数量 + 主题)
- 视频集：视频封面卡(时长/集数/分类)
- 首页“精选”模块复用同一组件

### 关于
- 头像 + Studio 文案 + 3~4 个能力卡片(卡片阵列)

## 组件与技术选型
- shadcn/ui：Tabs、Card、Button、Badge、Tooltip、Separator
- reactbits/magicui/aceternity：背景粒子、光晕、渐变球体、卡片 hover glow、玻璃容器、轻量入场动效
- 明暗色模式：基于 `app/ui/global.css` + Tailwind 变量控制，并在前台布局提供切换入口

## 数据与类型建议
- MediaItem：id、type(photo|video)、title、cover、tags、createdAt、collectionId
- Collection：id、type(photo|video)、title、cover、count、description
- 首页/画廊/图集/视频集共用 `app/lib/definitions.ts` 中的类型定义

## 开发阶段建议
- 定路由 + 前台 layout + 导航
- 搭基础 UI (Hero、精选区、画廊筛选、卡片)
- 接数据与筛选逻辑(可先用 placeholder-data)
- 逐步替换视觉组件(引入 reactbits/magicui/aceternity 风格)
- 响应式细节与性能优化(图片懒加载/next/image)

## 组件导入提示
- 优先直接使用 reactbits/magicui/aceternity 的现成组件或模板。
- 如果我无法拉取对应组件代码，我会明确指出需要你手动导入的组件名称与来源页面。

## 进度清单
- [ ] 1. 确认路由名称、详情页(如有)、数据源(本地/接口)
- [ ] 2. 在 app/(front) 下添加前台路由骨架
- [ ] 3. 构建共享布局(导航/页脚/背景/排版/明暗切换)
- [ ] 4. 定义共享类型(MediaItem、Collection)
- [ ] 5. 共享 UI 组件
  - [ ] 5.1 玻璃态导航
  - [ ] 5.2 分区标题 + “查看全部”
  - [ ] 5.3 作品集卡片(照片/视频)
  - [ ] 5.4 媒体卡片(照片/视频)
  - [ ] 5.5 筛选 Tabs(全部/照片/视频/时间线)
- [ ] 6. 首页
  - [ ] 6.1 Hero 轮播(精选作品集)
  - [ ] 6.2 精选视频作品集
  - [ ] 6.3 精选照片作品集
  - [ ] 6.4 画廊亮点
- [ ] 7. 画廊页
  - [ ] 7.1 筛选栏
  - [ ] 7.2 Masonry 或错落网格
- [ ] 8. 照片作品集页
- [ ] 9. 视频作品集页
- [ ] 10. 关于页(头像、简介、亮点卡片)
- [ ] 11. 视觉层融合(reactbits/magicui/aceternity 风格)
  - [ ] 11.1 背景粒子/光晕
  - [ ] 11.2 卡片悬停光晕
  - [ ] 11.3 页面进入动效
- [ ] 12. 响应式适配与细节打磨
- [ ] 13. 手动检查与 lint(如需要)

## 待办列表
- [ ] 明确是否需要详情页及其路由规则
- [ ] 明确数据源(本地静态/服务端/接口)与字段
- [ ] 明暗色模式的主题色板与变量命名
- [ ] 优先使用的 reactbits/magicui/aceternity 组件清单
- [ ] 先搭公共布局与首页骨架，再拆出核心卡片组件

## 组件参考(需适配)
- reactbits.dev：粒子背景、移动光点、动态渐变
- magicui.design：Hero 光晕、渐变球体、进入动效
- ui.aceternity.com：悬停发光卡片、玻璃容器
