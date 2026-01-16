'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface MasonryGridProps {
  items: React.ReactNode[];
  className?: string;
  columnClassName?: string;
  gap?: number;
  // breakpoint -> columns
  breakpoints?: { [key: number]: number };
}

export function MasonryGrid({ 
  items, 
  className, 
  columnClassName, 
  gap = 16,
  breakpoints = { 640: 1, 768: 2, 1024: 3, 1280: 4 }
}: MasonryGridProps) {
  const [columns, setColumns] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateColumns = () => {
      // if (!containerRef.current) return;
      // const width = containerRef.current.offsetWidth;
      // Use window width for simpler breakpoint logic consistent with Tailwind
      const width = window.innerWidth;
      
      let cols = 1;
      const sortedBreakpoints = Object.keys(breakpoints)
        .map(Number)
        .sort((a, b) => a - b);

      for (const bp of sortedBreakpoints) {
        if (width >= bp) {
          cols = breakpoints[bp];
        }
      }
      setColumns(cols);
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, [breakpoints]);

  const columnItems = useMemo(() => {
    const cols = Array.from({ length: columns }, () => [] as React.ReactNode[]);
    items.forEach((item, index) => {
      cols[index % columns].push(item);
    });
    return cols;
  }, [items, columns]);

  return (
    <div 
        ref={containerRef} 
        className={cn("flex items-start", className)} 
        style={{ gap: `${gap}px` }}
    >
      {columnItems.map((col, i) => (
        <div 
            key={i} 
            className={cn("flex flex-col flex-1", columnClassName)}
            style={{ gap: `${gap}px` }}
        >
          {col}
        </div>
      ))}
    </div>
  );
}
