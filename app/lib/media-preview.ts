/**
 * 灯箱预览必须读取原图投递路由，而不是网格缩略图。
 *
 * `files.thumbUrl` 可能是扫描时写入的绝对地址（内网 IP / http），在外网
 * HTTPS 页面里会被混合内容策略拦截，表现为破图；`/api/media/stream/:id`
 * 是同源路由，且对未发布媒体有 owner/分享鉴权。
 */
export function resolveMediaFullSrc(item: { id: number }): string {
  return `/api/media/stream/${item.id}`;
}
