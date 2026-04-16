import { useCallback, useEffect, useRef, useState } from 'react';

type Position = {
  x: number;
  y: number;
};

type SelectionBox = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

export function useRubberBandSelection<T extends { id: number }>(
  items: T[],
  containerRef: React.RefObject<HTMLElement | null>,
  itemRefs: React.MutableRefObject<Record<number, HTMLElement | null>>,
  onSelectionChange: (selectedIds: Set<number>) => void,
  isEnabled: boolean = true
) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const startPosRef = useRef<Position | null>(null);
  const initialSelectedRef = useRef<Set<number>>(new Set());

  const getRelativePosition = useCallback(
    (clientX: number, clientY: number): Position => {
      const container = containerRef.current;
      if (!container) return { x: clientX, y: clientY };

      const rect = container.getBoundingClientRect();
      const scrollLeft = container.scrollLeft;
      const scrollTop = container.scrollTop;

      return {
        x: clientX - rect.left + scrollLeft,
        y: clientY - rect.top + scrollTop,
      };
    },
    [containerRef]
  );

  const checkIntersection = useCallback(
    (box: SelectionBox): Set<number> => {
      const selected = new Set<number>();

      const minX = Math.min(box.startX, box.endX);
      const maxX = Math.max(box.startX, box.endX);
      const minY = Math.min(box.startY, box.endY);
      const maxY = Math.max(box.startY, box.endY);

      items.forEach((item) => {
        const element = itemRefs.current[item.id];
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const container = containerRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const scrollLeft = container.scrollLeft;
        const scrollTop = container.scrollTop;

        const itemLeft = rect.left - containerRect.left + scrollLeft;
        const itemTop = rect.top - containerRect.top + scrollTop;
        const itemRight = itemLeft + rect.width;
        const itemBottom = itemTop + rect.height;

        // 检查是否相交
        if (
          itemRight >= minX &&
          itemLeft <= maxX &&
          itemBottom >= minY &&
          itemTop <= maxY
        ) {
          selected.add(item.id);
        }
      });

      return selected;
    },
    [items, itemRefs, containerRef]
  );

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!isEnabled) return;
      
      // 只响应左键
      if (e.button !== 0) return;

      // 如果点击的是可交互元素，不启动框选
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('a')
      ) {
        return;
      }

      const pos = getRelativePosition(e.clientX, e.clientY);
      startPosRef.current = pos;
      setIsSelecting(true);
      setSelectionBox({
        startX: pos.x,
        startY: pos.y,
        endX: pos.x,
        endY: pos.y,
      });

      // 记录初始选中状态（用于 Shift 键追加选择）
      initialSelectedRef.current = new Set();

      e.preventDefault();
    },
    [isEnabled, getRelativePosition]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isSelecting || !startPosRef.current) return;

      const pos = getRelativePosition(e.clientX, e.clientY);
      const box: SelectionBox = {
        startX: startPosRef.current.x,
        startY: startPosRef.current.y,
        endX: pos.x,
        endY: pos.y,
      };

      setSelectionBox(box);

      // 实时更新选中项
      const intersected = checkIntersection(box);
      
      // 如果按住 Shift，追加到初始选中
      if (e.shiftKey) {
        const combined = new Set([...initialSelectedRef.current, ...intersected]);
        onSelectionChange(combined);
      } else {
        onSelectionChange(intersected);
      }
    },
    [isSelecting, getRelativePosition, checkIntersection, onSelectionChange]
  );

  const handleMouseUp = useCallback(() => {
    if (!isSelecting) return;

    setIsSelecting(false);
    setSelectionBox(null);
    startPosRef.current = null;
  }, [isSelecting]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [containerRef, handleMouseDown, handleMouseMove, handleMouseUp]);

  return {
    isSelecting,
    selectionBox,
  };
}

