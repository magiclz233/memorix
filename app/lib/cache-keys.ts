/**
 * 缓存键管理
 * 统一管理所有 Redis 缓存键的生成规则
 */
export const CacheKeys = {
  // 画廊列表: gallery:list:{mediaType}:{page}:{limit}
  galleryList: (mediaType: string, page: number, limit: number) =>
    `gallery:list:${mediaType}:${page}:${limit}`,

  // 作品集详情: collection:detail:{id}
  collectionDetail: (id: number) => `collection:detail:${id}`,

  // 作品集媒体列表: collection:media:{id}
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

  // 首页 Hero 照片: front:hero
  frontHero: () => 'front:hero',

  // 首页精选集合: front:featured-collections
  frontFeaturedCollections: () => 'front:featured-collections',

  // 系统概览统计: dashboard:overview
  dashboardOverview: () => 'dashboard:overview',
} as const;

/**
 * 缓存 TTL 配置（单位：秒）
 */
export const CacheTTL = {
  galleryList: 60,           // 1 分钟
  collectionDetail: 300,     // 5 分钟
  collectionMedia: 300,      // 5 分钟
  userSettings: 600,         // 10 分钟
  mediaDetail: 300,          // 5 分钟
  mediaMetadata: 600,        // 10 分钟
  storageConfig: 3600,       // 1 小时
  rateLimit: 60,             // 1 分钟
  session: 86400,            // 24 小时
  csrfToken: 3600,           // 1 小时
  uploadTask: 86400,         // 24 小时
  instantUpload: 604800,     // 7 天
  frontHero: 300,            // 5 分钟
  frontFeaturedCollections: 300, // 5 分钟
  dashboardOverview: 60,     // 1 分钟
} as const;
