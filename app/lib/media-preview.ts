/**
 * 灯箱预览必须读取原图投递路由，而不是网格缩略图。
 *
 * `files.thumbUrl` 可能是扫描时写入的绝对地址（内网 IP / http），在外网
 * HTTPS 页面里会被混合内容策略拦截，表现为破图。
 *
 * 注意：`/api/media/stream/:id` 只处理视频；图片原图必须走
 * `/api/local-files/:id`（该路由同时支持本地/NAS 与 S3，且对未发布媒体
 * 做 owner/分享鉴权）。两者都是同源路由，避免混合内容。
 */
export function resolveMediaFullSrc(item: {
  id: number;
  mediaType?: string | null;
}): string {
  return item.mediaType === 'video'
    ? `/api/media/stream/${item.id}`
    : `/api/local-files/${item.id}`;
}
