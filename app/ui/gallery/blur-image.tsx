'use client';

import { useState, useEffect, useRef } from 'react';
import { decode } from 'blurhash';
import { cn } from '@/lib/utils';
import Image, { ImageProps } from 'next/image';

interface BlurImageProps extends ImageProps {
  blurHash?: string | null;
}

export function BlurImage({ src, blurHash, alt, className, onLoadingComplete, ...props }: BlurImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (blurHash && canvasRef.current) {
      try {
        const pixels = decode(blurHash, 32, 32);
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          const imageData = ctx.createImageData(32, 32);
          imageData.data.set(pixels);
          ctx.putImageData(imageData, 0, 0);
        }
      } catch (e) {
        // console.error('Error decoding blurhash', e);
      }
    }
  }, [blurHash]);

  return (
    <>
      {blurHash && (
        <canvas
          ref={canvasRef}
          width={32}
          height={32}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
            isLoaded ? "opacity-0" : "opacity-100 pointer-events-none"
          )}
        />
      )}
      <Image
        src={src}
        alt={alt}
        className={cn(
          "transition-opacity duration-500",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        onLoadingComplete={(img) => {
            setIsLoaded(true);
            onLoadingComplete?.(img);
        }}
        {...props}
      />
    </>
  );
}
