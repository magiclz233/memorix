/**
 * 媒体标签批量合并纯函数：
 * 供 setMediaTags 服务端单次读-改-写使用，避免并发写同一条 JSONB 产生竞态覆盖。
 */

export type MediaTagsMap = Record<string, string[]>;
export type MediaTagUpdateMode = 'add' | 'replace' | 'remove';

export const MAX_TAGS_PER_FILE = 12;
export const MAX_TAG_LENGTH = 32;

export function normalizeMediaTags(tags: readonly unknown[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const raw of tags) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim().slice(0, MAX_TAG_LENGTH);
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
    if (result.length >= MAX_TAGS_PER_FILE) break;
  }

  return result;
}

export function applyMediaTagsBatch(
  currentMap: MediaTagsMap,
  fileIds: readonly number[],
  tags: readonly string[],
  mode: MediaTagUpdateMode = 'replace',
): MediaTagsMap {
  const nextMap: MediaTagsMap = {};
  for (const [key, list] of Object.entries(currentMap)) {
    const normalized = normalizeMediaTags(list);
    if (normalized.length > 0) {
      nextMap[key] = normalized;
    }
  }

  const normalizedInput = normalizeMediaTags(tags);
  const removeSet = new Set(normalizedInput);

  for (const fileId of fileIds) {
    if (!Number.isSafeInteger(fileId) || fileId <= 0) continue;
    const key = String(fileId);
    const existing = nextMap[key] ?? [];

    let updated: string[];
    if (mode === 'add') {
      updated = normalizeMediaTags([...existing, ...normalizedInput]);
    } else if (mode === 'remove') {
      updated = existing.filter((tag) => !removeSet.has(tag));
    } else {
      updated = normalizedInput;
    }

    if (updated.length > 0) {
      nextMap[key] = updated;
    } else {
      delete nextMap[key];
    }
  }

  return nextMap;
}
