type SelectionBoxProps = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

export function SelectionBox({ startX, startY, endX, endY }: SelectionBoxProps) {
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  return (
    <div
      className="pointer-events-none absolute z-50 border-2 border-indigo-500 bg-indigo-500/10"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  );
}
