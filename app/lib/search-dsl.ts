/**
 * P1-4 搜索 DSL：把 `type:video camera:sony 海边` 解析成结构化字段 + 自由文本。
 *
 * 纯函数、无依赖，便于 Vitest 覆盖。设计要点：
 * - 支持 `key:value` 与带引号的值 `camera:"Sony A7 IV"`；
 * - 未知 key 不当字段，原样并入自由文本（不丢查询词）；
 * - 自由文本用空格拼回，交给 pg_trgm 加速的 ILIKE；
 * - 字段值做长度上限，避免恶意超长输入打到 DB。
 */

export type SearchFields = {
  type?: string;
  camera?: string;
  maker?: string;
  lens?: string;
  title?: string;
  description?: string;
  location?: string;
  author?: string;
  year?: number;
};

export type ParsedSearch = {
  freeText: string;
  fields: SearchFields;
};

const KNOWN_KEYS = new Set([
  'type',
  'camera',
  'maker',
  'lens',
  'title',
  'description',
  'desc',
  'location',
  'place',
  'author',
  'year',
]);

const MAX_VALUE_LENGTH = 80;

/** 解析 token，兼容 key:value 和 key:"multi word value" */
const TOKEN_RE = /^([a-zA-Z]+):\s*("([^"]*)"|'([^']*)'|(\S+))$/;

export function parseSearchDSL(input: string | null | undefined): ParsedSearch {
  const fields: SearchFields = {};
  const freeParts: string[] = [];
  if (!input || typeof input !== 'string') return { freeText: '', fields };

  const tokens = input.match(/(?:[^\s"]+|"[^"]*"|'[^']*')+/g) ?? [];
  for (const token of tokens) {
    const match = token.match(TOKEN_RE);
    if (!match) {
      freeParts.push(token);
      continue;
    }
    const key = match[1].toLowerCase();
    if (!KNOWN_KEYS.has(key)) {
      // 未知字段：整段保留为自由文本，不丢弃信息
      freeParts.push(token);
      continue;
    }
    const rawValue = match[3] ?? match[4] ?? match[5] ?? '';
    const value = rawValue.trim().slice(0, MAX_VALUE_LENGTH);
    if (!value) {
      freeParts.push(token);
      continue;
    }
    switch (key) {
      case 'type':
        fields.type = normalizeType(value);
        break;
      case 'desc':
        fields.description = value;
        break;
      case 'place':
        fields.location = value;
        break;
      case 'year': {
        const year = Number.parseInt(value, 10);
        if (Number.isInteger(year) && year >= 1900 && year <= 2200) fields.year = year;
        else freeParts.push(token);
        break;
      }
      default:
        (fields as Record<string, string | number>)[key] = value;
    }
  }

  return { freeText: freeParts.join(' ').trim(), fields };
}

function normalizeType(value: string): string {
  const v = value.toLowerCase();
  if (v === 'photo' || v === 'image' || v === '图片' || v === '照片') return 'image';
  if (v === 'video' || v === '视频') return 'video';
  if (v === 'animated' || v === 'gif' || v === '动图') return 'animated';
  return v;
}

/** 是否包含结构化字段（用于决定是否跳过纯自由文本的快速路径） */
export function hasStructuredFields(parsed: ParsedSearch): boolean {
  return Object.keys(parsed.fields).length > 0;
}
