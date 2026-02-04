'use client';

import { useEffect, useRef } from 'react';

type HistogramProps = {
  src: string;
  className?: string;
};

export function Histogram({ src, className }: HistogramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = src;

    img.onload = () => {
      const w = Math.min(img.width, 300); // Scale down for performance
      const h = Math.round(w * (img.height / img.width));
      
      const offCanvas = document.createElement('canvas');
      offCanvas.width = w;
      offCanvas.height = h;
      const offCtx = offCanvas.getContext('2d');
      if (!offCtx) return;

      offCtx.drawImage(img, 0, 0, w, h);
      const imageData = offCtx.getImageData(0, 0, w, h);
      const data = imageData.data;

      const r = new Array(256).fill(0);
      const g = new Array(256).fill(0);
      const b = new Array(256).fill(0);

      for (let i = 0; i < data.length; i += 4) {
        r[data[i]]++;
        g[data[i + 1]]++;
        b[data[i + 2]]++;
      }

      const max = Math.max(...r, ...g, ...b);

      // Draw histogram
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'screen';

      const drawChannel = (hist: number[], color: string) => {
        ctx.fillStyle = color;
        const barWidth = width / 256;
        for (let i = 0; i < 256; i++) {
          const barHeight = (hist[i] / max) * height;
          ctx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
        }
      };

      drawChannel(r, 'rgba(239, 68, 68, 0.6)'); // red-500
      drawChannel(g, 'rgba(34, 197, 94, 0.6)'); // green-500
      drawChannel(b, 'rgba(59, 130, 246, 0.6)'); // blue-500
    };
  }, [src]);

  return (
    <canvas 
      ref={canvasRef} 
      width={256} 
      height={100} 
      className={className} 
    />
  );
}
