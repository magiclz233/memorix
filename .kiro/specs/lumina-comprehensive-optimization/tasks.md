# 实施计划：Lumina Pro 系统全面优化

## 概述

按优先级分 8 个维度对 Lumina Pro 进行系统级优化，从代码架构基础到部署运维，逐步构建生产级别的性能、安全性与可维护性。每个维度的任务相互独立，可并行推进，但建议按顺序执行以确保基础设施就绪。

## 任务列表

- [x] 1. 代码架构优化：类型系统、错误边界与日志系统
  - [x] 1.1 完善 `app/lib/definitions.ts` 类型定义
    - 补充 `WebVitalsMetric`、`PerformanceMetrics`、`CacheConfig`、`CacheEntry`、`HealthCheckResult`、`BackupRecord`、`AlertRule`、`LogEntry` 等接口定义
    - 为所有 Server Actions 添加统一的 `ActionResult<T>` 和 `PaginatedResult<T>` 返回类型
    - 为所有数据查询函数补充明确的返回类型注解
    - 添加 `isMediaFile`、`isImageFile`、`isVideoFile` 类型守卫函数
    - _需求：3.1, 3.2, 3.3_

  - [x] 1.2 完善 `app/lib/errors.ts` 统一错误类型
    - 实现 `AppError`、`ValidationError`、`AuthenticationError`、`AuthorizationError`、`NotFoundError`、`RateLimitError` 错误类
    - 实现 `handleApiError` API 错误处理中间件，统一 API 路由的错误响应格式
    - _需求：3.4, 3.6_

  - [x] 1.3 完善 `app/lib/logger.ts` 结构化日志系统
    - 确认 pino 依赖已安装，配置开发环境 pretty 输出、生产环境 JSON 输出
    - 实现 `createLogger(module)` 子日志器工厂函数
    - 实现 `logRequest` 请求日志中间件，记录 requestId、method、url、duration
    - 实现日志级别控制（通过 `LOG_LEVEL` 环境变量）
    - _需求：3.7, 3.8, 3.9_

  - [ ]* 1.4 为日志系统编写单元测试
    - 测试 `createLogger` 子日志器创建
    - 测试 `logRequest` 请求日志记录
    - _需求：3.7_

  - [x] 1.5 完善 `app/ui/components/error-boundary.tsx` 全局错误边界
    - 确认 `ErrorBoundary` 类组件实现 `getDerivedStateFromError` 和 `componentDidCatch`
    - 在 `componentDidCatch` 中调用 `logger.error` 记录错误信息
    - 在 `app/layout.tsx` 根布局中包裹 `ErrorBoundary`
    - _需求：3.5_

  - [x] 1.6 实现 `app/lib/validations.ts` 统一表单验证
    - 确认 zod 依赖已安装
    - 实现 `uploadSchema`、`collectionSchema`、`userSettingsSchema` Zod schema
    - 实现 `validateData<T>` 通用验证辅助函数
    - 在现有 Server Actions 中替换手动验证逻辑为 Zod 验证
    - _需求：3.13_

  - [ ]* 1.7 为表单验证逻辑编写单元测试
    - 测试各 schema 的合法输入和非法输入
    - 测试 `validateData` 的成功和失败路径
    - _需求：5.3_

  - [x] 1.8 检查并修复 TypeScript 严格模式错误
    - 确认 `tsconfig.json` 中 `strict: true` 已启用
    - 运行 `pnpm tsc --noEmit` 修复所有类型错误
    - _需求：3.16_

- [x] 2. 检查点 - 架构基础验证
  - 确认类型系统、错误处理、日志系统均可正常工作，运行 `pnpm tsc --noEmit` 无错误，如有问题请告知。

- [x] 3. 安全性加固：响应头、速率限制与文件验证
  - [x] 3.1 实现安全响应头中间件
    - 在 `middleware.ts` 中添加 `X-Frame-Options: DENY`、`X-Content-Type-Options: nosniff`、`X-XSS-Protection`、`Referrer-Policy`、`Permissions-Policy` 响应头
    - 配置 Content Security Policy（CSP）头
    - 确保 middleware matcher 覆盖所有非静态资源路径
    - _需求：4.22_

  - [x] 3.2 完善 `app/lib/rate-limit.ts` 速率限制器
    - 实现基于 Redis 滑动窗口算法的 `RateLimiter.check` 方法
    - 定义 `RateLimits` 预设配置：login（5次/分钟）、upload（20次/分钟）、search（30次/分钟）
    - 在登录 API、上传 API、搜索 API 路由中接入速率限制
    - 速率超限时返回 429 状态码
    - _需求：4.13, 4.14, 4.15, 4.16_

  - [ ]* 3.3 为速率限制器编写单元测试
    - 测试正常请求通过
    - 测试超限请求被拒绝并返回正确的 `RateLimitInfo`
    - _需求：4.13_

  - [x] 3.4 实现 `app/lib/file-validator.ts` 文件上传安全验证
    - 实现 `FileValidator.isAllowedType` MIME 类型白名单验证
    - 实现 `FileValidator.verifyFileSignature` 文件魔数验证
    - 实现 `FileValidator.isValidSize` 文件大小验证（最大 500MB）
    - 实现 `FileValidator.scanForMalware` 恶意代码特征扫描
    - 实现 `FileValidator.validate` 完整验证流程
    - 在上传 API 路由中集成文件验证
    - _需求：4.9, 4.10, 4.11, 4.12_

  - [ ]* 3.5 为文件验证器编写单元测试
    - 测试合法文件类型通过验证
    - 测试非法 MIME 类型被拒绝
    - 测试超大文件被拒绝
    - 测试文件签名不匹配被拒绝
    - _需求：4.9, 4.10_

  - [x] 3.6 实现 `app/lib/sanitize.ts` XSS 防护
    - 安装 `isomorphic-dompurify` 依赖
    - 实现 `Sanitizer.sanitizeHtml`、`Sanitizer.sanitizeInput`、`Sanitizer.escapeHtml`
    - 实现 `app/ui/components/safe-html.tsx` 安全 HTML 渲染组件
    - 在用户输入处理的 Server Actions 中集成输入过滤
    - _需求：4.6, 4.7_

  - [x] 3.7 完善 `app/lib/metadata-extractor.ts` EXIF GPS 数据脱敏
    - 修改 `extractMetadata` 函数，默认不提取 GPS 数据（`preserveGPS: false`）
    - 删除 EXIF 中所有 GPS 相关字段（GPSLatitude、GPSLongitude、GPSAltitude 等）
    - 在用户设置中添加 `preserveGPS` 选项控制
    - _需求：4.17, 4.18_

  - [x] 3.8 实现 `app/lib/csrf.ts` CSRF 防护
    - 实现 `CSRFProtection.generateToken` 生成并缓存 CSRF Token
    - 实现 `CSRFProtection.verifyToken` 使用时间安全比较验证 Token
    - 实现 `CSRFProtection.middleware` 中间件，对非 GET 请求验证 Token
    - 实现 `/api/csrf-token` 端点供客户端获取 Token
    - 实现 `app/ui/hooks/use-csrf.ts` 客户端 Hook
    - _需求：4.3_

- [x] 4. 检查点 - 安全层验证
  - 确认安全响应头、速率限制、文件验证均正常工作，运行 `pnpm lint` 无错误，如有问题请告知。

- [x] 5. 后端性能优化：数据库索引、Redis 缓存与查询优化
  - [x] 5.1 添加数据库复合索引
    - 在 `app/lib/schema.ts` 的 `files` 表中添加以下新索引：
      - `mediaTypePublishedMtimeIndex`（mediaType + isPublished + mtime）
      - `storageMediaTypeIndex`（userStorageId + mediaType）
      - `createdAtIndex`（createdAt）
      - `deletedPublishedIndex`（deletedAt + isPublished）
    - 添加 `performanceMetrics`、`errorLogs`、`auditLogs` 新数据表定义
    - 生成并执行数据库迁移：`pnpm drizzle-kit generate` 后提示用户执行迁移
    - _需求：2.1_

  - [x] 5.2 实现 `app/lib/cache-keys.ts` 缓存键管理
    - 实现 `CacheKeys` 常量对象，包含所有缓存键生成函数
    - 实现 `CacheTTL` 常量对象，定义各类数据的 TTL
    - _需求：2.4, 2.5, 2.6, 2.7_

  - [x] 5.3 实现 `app/lib/cache.ts` Redis 缓存管理器
    - 实现 `CacheManager` 类，包含 `get`、`set`、`del`、`delPattern`、`wrap` 方法
    - 配置 Redis 连接重试策略和错误降级（Redis 不可用时不抛出异常）
    - 实现 `getStats` 缓存命中率统计
    - _需求：2.4_

  - [ ]* 5.4 为缓存管理器编写单元测试
    - 测试 `wrap` 方法缓存命中和未命中路径
    - 测试 `delPattern` 批量删除
    - 测试 Redis 不可用时的降级行为
    - _需求：2.4_

  - [x] 5.5 优化 `app/lib/data/front.ts` 数据查询函数
    - 将 `getGalleryItems` 接入 `cache.wrap`，TTL 60 秒
    - 将 `getCollectionDetail` 接入 `cache.wrap`，TTL 300 秒
    - 修复 N+1 查询问题，使用 JOIN 替代循环查询
    - 实现游标分页 `getMediaWithCursorPagination`，替换 OFFSET 分页
    - _需求：2.2, 2.5, 2.6, 2.14_

  - [x] 5.6 优化 `app/lib/drizzle.ts` 数据库连接池
    - 配置 postgres-js 连接池参数：`max: 20`、`idle_timeout: 20`、`connect_timeout: 10`、`prepare: true`
    - 实现 `checkDatabaseConnection` 健康检查函数
    - _需求：2.3_

  - [x] 5.7 实现 `app/lib/db-monitor.ts` 慢查询监控
    - 实现 `monitorQuery` 高阶函数，记录查询耗时
    - 当查询超过 3 秒时，调用 `logger.warn` 记录慢查询日志
    - 在关键数据查询函数中包裹 `monitorQuery`
    - _需求：2.15, 2.16_

  - [x] 5.8 实现缓存失效策略
    - 在 `app/lib/actions/media.ts` 的媒体状态变更操作中，清除相关画廊列表缓存和媒体详情缓存
    - 在作品集 CRUD 操作中，清除对应的作品集缓存
    - 在用户设置更新操作中，清除用户设置缓存
    - _需求：2.5, 2.6, 2.7_

- [x] 6. 检查点 - 后端性能验证
  - 确认数据库迁移成功、Redis 缓存正常工作、慢查询日志可见，如有问题请告知。

- [x] 7. 前端性能优化：虚拟滚动、代码分割与 ISR 缓存
  - [x] 7.1 实现 `app/ui/components/virtual-scroller.tsx` 虚拟滚动组件
    - 安装 `@tanstack/react-virtual` 依赖
    - 实现泛型 `VirtualScroller<T>` 组件，支持 `estimateSize`、`overscan`、`renderItem` props
    - _需求：1.7_

  - [x] 7.2 实现 `app/ui/components/optimized-image.tsx` 响应式图片组件
    - 安装 `react-blurhash` 依赖
    - 实现 `OptimizedImage` 组件，集成 BlurHash 占位符和 Next.js Image 懒加载
    - 图片加载完成后淡入显示，隐藏 BlurHash 占位符
    - _需求：1.4, 1.6_

  - [x] 7.3 实现 `app/ui/front/gallery/virtual-gallery-grid.tsx` 画廊虚拟滚动
    - 基于 `VirtualScroller` 实现 `VirtualGalleryGrid` 组件
    - 将一维媒体数组转换为行数组，支持响应式列数
    - 使用 `OptimizedImage` 渲染每个媒体项
    - _需求：1.7_

  - [x] 7.4 实现画廊页面动态导入与代码分割
    - 在画廊页面使用 `next/dynamic` 动态导入 `VirtualGalleryGrid`（`ssr: false`）
    - 动态导入 `GalleryFilter` 组件
    - 动态导入 Framer Motion（`motion.div`）避免打包到主 bundle
    - 为动态导入组件配置 `loading` 骨架屏
    - _需求：1.8, 1.9_

  - [x] 7.5 配置 ISR 和 SWR 缓存策略
    - 在画廊页面（`app/(front)/gallery/page.tsx`）添加 `export const revalidate = 60`
    - 实现 `app/ui/hooks/use-gallery-data.ts` SWR Hook，配置 `dedupingInterval: 60000`
    - _需求：1.12, 1.13_

  - [x] 7.6 配置 `next.config.ts` 图片优化
    - 配置 `images.formats: ['image/avif', 'image/webp']`
    - 配置 `deviceSizes` 和 `imageSizes` 响应式断点
    - 启用 `experimental.optimizeCss: true`
    - 生产环境启用 `compiler.removeConsole`
    - 配置 `output: 'standalone'` 支持 Docker 部署
    - _需求：1.4, 1.5, 1.15_

  - [x] 7.7 实现 `public/sw.js` Service Worker 缓存
    - 图片资源使用 Cache First 策略
    - API 请求使用 Network First 策略
    - 其他静态资源使用 Stale-While-Revalidate 策略
    - 在 `app/layout.tsx` 中注册 Service Worker
    - _需求：1.14_

  - [x] 7.8 优化字体加载
    - 确认 `app/ui/fonts.ts` 中所有字体配置 `display: 'swap'`
    - 确认中文字体（Noto Sans SC）配置了必要的字重子集
    - _需求：1.11_

- [x] 8. 检查点 - 前端性能验证
  - 确认虚拟滚动、动态导入、ISR 缓存均正常工作，运行 `pnpm build` 无错误，如有问题请告知。

- [x] 9. 监控与日志体系：Web Vitals、错误追踪与告警
  - [x] 9.1 实现 `app/ui/components/web-vitals-reporter.tsx` Web Vitals 收集
    - 安装 `web-vitals` 依赖
    - 实现 `WebVitalsReporter` 客户端组件，收集 CLS、FID、FCP、LCP、TTFB
    - 使用 `navigator.sendBeacon` 上报指标到 `/api/analytics/vitals`
    - 在 `app/layout.tsx` 中挂载 `WebVitalsReporter`
    - _需求：7.1, 7.2_

  - [x] 9.2 实现 `/api/analytics/vitals` 指标存储端点
    - 接收 Web Vitals 数据并写入 `performance_metrics` 表
    - _需求：7.1_

  - [x] 9.3 实现 `app/lib/error-reporter.ts` 错误上报
    - 安装 `@sentry/nextjs` 依赖（可选，若无 Sentry DSN 则跳过 Sentry 集成）
    - 实现 `reportError` 和 `reportMessage` 函数
    - 在 `ErrorBoundary.componentDidCatch` 中调用 `reportError`
    - 在关键 Server Actions 的 catch 块中调用 `reportError`
    - _需求：7.5, 7.6_

  - [x] 9.4 实现 `app/lib/alerting.ts` 告警规则引擎
    - 实现 `AlertManager.checkRules` 遍历告警规则
    - 实现 `AlertManager.evaluateRule` 查询指标并评估阈值条件
    - 实现 `AlertManager.triggerAlert` 触发告警通知（Slack Webhook、邮件）
    - 预定义告警规则：高 LCP（>2500ms）、高错误率（>5%）、慢 API（>3000ms）
    - _需求：7.15, 7.16_

  - [x] 9.5 实现 `/api/admin/logs` 日志查询 API
    - 支持按 level、startDate、endDate、search 过滤
    - 支持分页查询
    - 需要管理员权限
    - _需求：7.11_

  - [x] 9.6 实现 `app/dashboard/monitoring/page.tsx` 监控仪表盘
    - 展示最近 24 小时 Web Vitals 统计（avg、P50、P75、P95）
    - 展示错误级别统计（debug/info/warn/error 计数）
    - 展示最近 10 条错误日志
    - _需求：7.17, 7.18_

- [x] 10. 国际化完善：翻译检查、本地化格式与多语言 SEO
  - [x] 10.1 实现翻译缺失检测工具
    - 创建 `scripts/check-i18n.ts` 脚本，对比 `messages/zh-CN.json` 和 `messages/en.json` 的 key 结构
    - 输出缺失的翻译 key 列表
    - 为缺失翻译添加占位符并记录日志
    - _需求：6.1, 6.2, 6.15_

  - [x] 10.2 实现本地化格式工具函数
    - 在 `app/lib/i18n.ts` 中实现日期时间本地化格式函数（`formatDate`、`formatDateTime`）
    - 实现数字和货币本地化格式函数（`formatNumber`、`formatCurrency`）
    - 实现文件大小本地化显示函数（`formatFileSize`）
    - 在 UI 组件中替换硬编码的格式化逻辑
    - _需求：6.3, 6.4, 6.5_

  - [ ]* 10.3 为本地化格式函数编写单元测试
    - 测试中英文日期格式输出
    - 测试文件大小格式化（B/KB/MB/GB）
    - _需求：6.3, 6.5_

  - [x] 10.4 实现多语言 SEO 优化
    - 为所有前台页面生成多语言 `<meta>` 标签（og:locale、og:locale:alternate）
    - 为所有前台页面添加 `hreflang` 标签
    - 实现多语言 `sitemap.xml`（`app/sitemap.ts`）
    - 实现 `robots.txt`（`app/robots.ts`）
    - _需求：6.6, 6.7, 6.8, 6.9_

  - [x] 10.5 完善语言切换功能
    - 确认语言切换时保持当前页面路径
    - 将用户语言偏好存储到 Cookie（`NEXT_LOCALE`）
    - 根据 `Accept-Language` 请求头自动选择默认语言
    - _需求：6.10, 6.11, 6.12_

  - [x] 10.6 实现翻译文件自动排序脚本
    - 创建 `scripts/sort-i18n.ts` 脚本，对翻译文件的 key 进行字母排序
    - _需求：6.16_

- [x] 11. 检查点 - 监控与国际化验证
  - 确认 Web Vitals 上报、告警规则、翻译检测脚本均正常工作，如有问题请告知。

- [x] 12. 测试体系建设：Vitest 单元测试与 Playwright E2E
  - [x] 12.1 配置 Vitest 测试框架
    - 安装 `vitest`、`@vitejs/plugin-react`、`@testing-library/react`、`@testing-library/jest-dom`、`jsdom` 依赖
    - 创建 `vitest.config.ts`，配置 jsdom 环境、全局变量、路径别名
    - 创建 `vitest.setup.ts`，导入 `@testing-library/jest-dom`
    - 配置覆盖率阈值（lines/functions/branches/statements 均为 70%）
    - 在 `package.json` 中添加 `test:unit`、`test:coverage` 脚本
    - _需求：5.1, 5.11_

  - [x] 12.2 编写核心工具函数单元测试
    - 创建 `app/lib/__tests__/cache-keys.test.ts`，测试所有 `CacheKeys` 生成函数
    - 创建 `app/lib/__tests__/sanitize.test.ts`，测试 HTML 清理和转义函数
    - 创建 `app/lib/__tests__/file-validator.test.ts`，测试文件类型和大小验证
    - _需求：5.1, 5.2_

  - [ ]* 12.3 编写数据转换函数单元测试
    - 创建 `app/lib/__tests__/i18n.test.ts`，测试本地化格式函数
    - 创建 `app/lib/__tests__/errors.test.ts`，测试错误类型和错误码
    - _需求：5.2_

  - [x] 12.4 编写 Server Actions 集成测试
    - 创建 `app/lib/actions/__tests__/media.test.ts`，测试媒体发布状态更新
    - 创建 `app/lib/actions/__tests__/collections.test.ts`，测试作品集 CRUD
    - 使用测试数据库，在 `beforeEach`/`afterEach` 中创建和清理测试数据
    - _需求：5.4, 5.5_

  - [ ]* 12.5 编写 API 路由集成测试
    - 创建 `app/api/gallery/__tests__/route.test.ts`，测试画廊 API 返回格式和筛选功能
    - 创建 `app/api/health/__tests__/route.test.ts`，测试健康检查端点
    - _需求：5.4_

  - [x] 12.6 配置 Playwright E2E 测试框架
    - 安装 `@playwright/test` 依赖
    - 创建 `playwright.config.ts`，配置 Chromium/Firefox/WebKit 多浏览器测试
    - 创建 `e2e/fixtures/` 目录，放置测试用图片和视频文件
    - 在 `package.json` 中添加 `test:e2e` 脚本
    - _需求：5.7, 5.8, 5.9, 5.10_

  - [x] 12.7 编写用户登录 E2E 测试
    - 创建 `e2e/auth.spec.ts`，测试正常登录跳转到 `/dashboard`
    - 测试错误凭据显示错误提示
    - _需求：5.7_

  - [ ]* 12.8 编写媒体上传 E2E 测试
    - 创建 `e2e/upload.spec.ts`，测试图片上传成功流程
    - 测试上传进度条显示
    - _需求：5.8_

  - [ ]* 12.9 编写画廊浏览 E2E 测试
    - 创建 `e2e/gallery.spec.ts`，测试画廊图片展示
    - 测试媒体类型筛选
    - 测试虚拟滚动加载更多
    - _需求：5.9_

  - [ ]* 12.10 编写性能 E2E 测试
    - 创建 `e2e/performance.spec.ts`，收集并验证 Web Vitals 指标
    - 验证 LCP < 2500ms、CLS < 0.1
    - 验证图片使用现代格式（avif/webp）
    - _需求：5.12, 1.1, 1.2_

- [x] 13. 检查点 - 测试体系验证
  - 运行 `pnpm test:unit --run` 确认单元测试通过，运行 `pnpm test:coverage` 确认覆盖率达标，如有问题请告知。

- [x] 14. 部署与运维优化：Docker、CI/CD、备份与健康检查
  - [x] 14.1 实现 `/api/health` 健康检查端点
    - 创建 `app/api/health/route.ts`，检查数据库、Redis、存储源连接状态
    - 返回 `HealthCheckResult` 格式，全部健康返回 200，否则返回 503
    - _需求：8.16, 8.17, 8.18, 8.19_

  - [x] 14.2 实现 `app/lib/config-validator.ts` 配置验证
    - 使用 Zod 定义必需环境变量 schema（DATABASE_URL、REDIS_HOST、BETTER_AUTH_SECRET 等）
    - 在生产环境启动时调用 `validateConfig`，配置不合法则拒绝启动
    - _需求：8.6_

  - [x] 14.3 创建 `Dockerfile` 多阶段构建
    - 实现三阶段构建：deps（安装依赖）、builder（构建应用）、runner（运行时）
    - runner 阶段创建非 root 用户 `nextjs:nodejs`（uid 1001）
    - 使用 `node:22-alpine` 基础镜像
    - 确认 `next.config.ts` 中 `output: 'standalone'` 已配置
    - _需求：8.1, 8.2, 8.3_

  - [x] 14.4 创建 `docker-compose.yml` 一键启动配置
    - 配置 app、postgres（16-alpine）、redis（7-alpine）三个服务
    - 为 app 服务配置健康检查（调用 `/health` 端点）
    - 配置 postgres 和 redis 的持久化 volume
    - 配置服务依赖关系（app 依赖 postgres 和 redis 健康）
    - _需求：8.4_

  - [x] 14.5 创建 `.env.example` 环境变量模板
    - 包含所有必需和可选的环境变量，附带注释说明
    - 覆盖：应用配置、数据库、Redis、认证、存储（S3/七牛云）、监控（Sentry）、告警（Slack）、日志
    - _需求：8.5_

  - [x] 14.6 创建 `.github/workflows/test.yml` CI 测试流水线
    - 配置 unit-tests job：安装依赖、运行 lint、类型检查、单元测试、上传覆盖率
    - 配置 integration-tests job：启动 postgres 和 redis 服务容器，运行集成测试
    - 配置 e2e-tests job：安装 Playwright 浏览器，运行 E2E 测试，上传测试报告
    - _需求：5.15, 5.16, 8.7_

  - [x] 14.7 创建 `.github/workflows/deploy.yml` CD 部署流水线
    - 配置 build job：构建 Docker 镜像并推送到 GitHub Container Registry
    - 配置 deploy job：SSH 部署到生产服务器，执行数据库迁移，健康检查验证
    - 配置 production environment 需要手动审批
    - 部署失败时自动回滚并发送 Slack 通知
    - _需求：8.7, 8.8, 8.9, 8.10_

  - [x] 14.8 创建数据库备份脚本
    - 创建 `scripts/backup-database.sh`：pg_dump 压缩备份，生成 SHA256 校验和，清理 7 天前的旧备份
    - 创建 `scripts/restore-database.sh`：验证校验和，确认后执行恢复
    - _需求：8.11, 8.12, 8.14, 8.15_

  - [x] 14.9 创建媒体文件备份脚本
    - 创建 `scripts/backup-media.sh`：tar.gz 压缩备份，生成 SHA256 校验和，清理 30 天前的旧备份
    - _需求：8.13, 8.14_

  - [x] 14.10 配置 Cron 定时任务说明文档
    - 在 `docs/ops-guide.md` 中记录 crontab 配置：每天凌晨 2 点备份数据库，每周日凌晨 3 点备份媒体文件
    - 记录部署清单、回滚步骤、紧急联系人模板
    - _需求：8.11, 8.13, 8.22_

- [x] 15. 最终检查点 - 全面验证
  - 运行 `pnpm build` 确认生产构建成功，运行 `pnpm tsc --noEmit` 确认无类型错误，运行 `pnpm lint` 确认无 lint 错误，如有问题请告知。

## 备注

- 标有 `*` 的子任务为可选任务，可在 MVP 阶段跳过以加快交付
- 每个任务均引用了具体的需求条款，确保需求可追溯
- 检查点任务确保每个维度完成后进行阶段性验证
- 数据库迁移需在本地开发环境验证后再应用到生产环境
- Sentry 集成为可选项，若无 DSN 配置可跳过，使用内置日志系统替代
