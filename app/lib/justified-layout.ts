/**
 * P1-3 纯布局算法：把不定宽高比的图片排成「两端对齐的等高行」（justified rows）。
 * 不依赖 React / DOM，便于 Vitest 覆盖，也可服务端预计算。
 *
 * 思路（贪心 + 行内统一缩放，Knuth–Plass 的简化版）：
 * - 依次把图片塞进当前行，直到按 targetRowHeight 缩放后的行宽接近 containerWidth；
 * - 行内所有图片使用同一高度 h，使 Σ(aspect_i · h) + gap·(n-1) = containerWidth；
 * - 最后一行不强行拉满，高度封顶在 targetRowHeight，避免出现巨图。
 */
export type JustifiableItem = {
  id: string;
  width?: number | null;
  height?: number | null;
};

export type PositionedItem<T extends JustifiableItem> = {
  item: T;
  width: number;
  height: number;
  aspect: number;
};

export type JustifiedRow<T extends JustifiableItem> = {
  items: Array<PositionedItem<T>>;
  /** 行高（含图片高度，不含 gap） */
  height: number;
  /** 行在虚拟列表里的键 */
  key: string;
};

const DEFAULT_ASPECT = 4 / 3;

export function resolveAspect(item: JustifiableItem): number {
  if (
    typeof item.width === 'number' &&
    typeof item.height === 'number' &&
    item.width > 0 &&
    item.height > 0
  ) {
    return item.width / item.height;
  }
  return DEFAULT_ASPECT;
}

/** 计算 justified 行。返回值可直接喂给虚拟列表（每行一个 virtual item）。 */
export function computeJustifiedRows<T extends JustifiableItem>(
  items: T[],
  containerWidth: number,
  targetRowHeight: number,
  gap = 12,
): Array<JustifiedRow<T>> {
  const rows: Array<JustifiedRow<T>> = [];
  if (containerWidth <= 0 || targetRowHeight <= 0 || items.length === 0) return rows;

  let buffer: Array<PositionedItem<T>> = [];
  let bufferAspectSum = 0;

  const flush = (isLast: boolean) => {
    if (buffer.length === 0) return;
    const gaps = gap * (buffer.length - 1);
    // 行高：让行宽恰好铺满容器；最后一行封顶 targetRowHeight
    const fittedHeight = (containerWidth - gaps) / bufferAspectSum;
    const height = isLast ? Math.min(fittedHeight, targetRowHeight) : fittedHeight;
    // 按比例算出每张图宽度；最后一行不铺满时左对齐
    const positioned = buffer.map((entry) => ({
      ...entry,
      height,
      width: entry.aspect * height,
    }));
    rows.push({
      items: positioned,
      height,
      key: `row-${rows.length}-${positioned[0]?.item.id ?? ''}`,
    });
    buffer = [];
    bufferAspectSum = 0;
  };

  for (const item of items) {
    const aspect = resolveAspect(item);
    const candidateSum = bufferAspectSum + aspect;
    const candidateWidth = candidateSum * targetRowHeight + gap * buffer.length;
    buffer.push({ item, width: 0, height: 0, aspect });
    bufferAspectSum = candidateSum;
    // 加上当前图后按目标行高估算已达到/超过容器宽度 → 收行
    if (candidateWidth >= containerWidth) flush(false);
  }
  flush(true);

  return rows;
}

/**
 * 目标行高建议：由「期望列数」与容器宽度反推，宽度大时行更高、列数大体稳定。
 */
export function targetRowHeightForColumns(
  containerWidth: number,
  columns: number,
  avgAspect = 1.4,
): number {
  const safeColumns = Math.max(1, columns);
  return Math.max(120, (containerWidth - (safeColumns - 1) * 12) / safeColumns / avgAspect);
}
