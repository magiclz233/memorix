type Messages = Record<string, unknown>;

const getMessageString = (messages: Messages, key: string) => {
  let current: unknown = messages;
  for (const part of key.split('.')) {
    if (!current || typeof current !== 'object' || !(part in current)) {
      return null;
    }
    current = (current as Messages)[part];
  }
  return typeof current === 'string' ? current : null;
};

export const resolveMessage = (messages: Messages, key?: string | null) => {
  if (!key) return '';
  const value = getMessageString(messages, key);
  return value ?? key;
};

// ============ 本地化格式工具函数 ============

type Locale = 'zh-CN' | 'en';

/**
 * 格式化日期（仅日期部分）
 */
export function formatDate(date: Date | string | null | undefined, locale: Locale = 'zh-CN'): string {
  if (!date) return '--';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '--';

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * 格式化日期时间
 */
export function formatDateTime(date: Date | string | null | undefined, locale: Locale = 'zh-CN'): string {
  if (!date) return '--';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '--';

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * 格式化相对时间（如"3 天前"）
 */
export function formatRelativeTime(date: Date | string | null | undefined, locale: Locale = 'zh-CN'): string {
  if (!date) return '--';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '--';

  const diff = Date.now() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (days > 0) return rtf.format(-days, 'day');
  if (hours > 0) return rtf.format(-hours, 'hour');
  if (minutes > 0) return rtf.format(-minutes, 'minute');
  return rtf.format(-seconds, 'second');
}

/**
 * 格式化数字
 */
export function formatNumber(value: number, locale: Locale = 'zh-CN'): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * 格式化文件大小（本地化）
 */
export function formatFileSize(bytes: number | null | undefined, locale: Locale = 'zh-CN'): string {
  if (bytes == null || bytes < 0) return '--';

  const units = locale === 'zh-CN'
    ? ['B', 'KB', 'MB', 'GB', 'TB']
    : ['B', 'KB', 'MB', 'GB', 'TB'];

  if (bytes === 0) return `0 ${units[0]}`;

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);

  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  }).format(value)} ${units[i]}`;
}

/**
 * 格式化时长（秒 → 可读格式）
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return '--';

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}
