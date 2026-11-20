/**
 * P2-10：画廊 keyset 分页游标。
 *
 * 只编码排序键 (sort_at, id)，不含任何媒体内容；客户端原样回传即可。
 * 用 base64url 避免 URL 转义问题，前半段版本号便于以后扩展格式。
 */

export type GalleryCursor = {
  sortAt: Date;
  id: number;
};

const CURSOR_PREFIX = 'v1';

export function encodeGalleryCursor(cursor: GalleryCursor): string {
  const payload = `${CURSOR_PREFIX}.${cursor.sortAt.getTime()}.${cursor.id}`;
  return Buffer.from(payload, 'utf8').toString('base64url');
}

export function decodeGalleryCursor(value: string | null | undefined): GalleryCursor | null {
  if (!value) return null;

  try {
    const parts = Buffer.from(value, 'base64url').toString('utf8').split('.');
    if (parts.length !== 3 || parts[0] !== CURSOR_PREFIX) return null;

    if (!parts[1] || !parts[2]) return null;
    const time = Number(parts[1]);
    const id = Number(parts[2]);
    if (!Number.isSafeInteger(time) || !Number.isSafeInteger(id) || id <= 0) return null;

    const sortAt = new Date(time);
    if (Number.isNaN(sortAt.getTime())) return null;

    return { sortAt, id };
  } catch {
    return null;
  }
}

/** 从查询结果构造游标；sortAt 缺失或非法时返回 null。 */
export function galleryCursorFromRecord(record: {
  id: number;
  sortAt?: Date | string | null;
}): GalleryCursor | null {
  if (!record.sortAt) return null;
  if (!Number.isSafeInteger(record.id) || record.id <= 0) return null;
  const sortAt = record.sortAt instanceof Date ? record.sortAt : new Date(record.sortAt);
  if (Number.isNaN(sortAt.getTime())) return null;
  return { sortAt, id: record.id };
}
