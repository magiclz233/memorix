'use client';

import { useEffect, useRef, useState } from 'react';
import { decode } from 'blurhash';
import Image, { type ImageProps } from 'next/image';
import { cn } from '@/lib/utils';

interface BlurImageProps extends ImageProps {
  blurHash?: string | null;
}

export function BlurImage({
  src,
  blurHash,
  alt,
  className,
  onLoadingComplete,
  width,
  height,
  fill,
  sizes,
  ...props
}: BlurImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 本地 API（尤其是未发布媒体的鉴权路由）必须由浏览器携带 cookie 直接请求，
  // 不能交给 Next.js 图片优化器在服务端无会话拉取；远程 URL 同样绕过优化。
  const shouldBypassOptimization =
    typeof src === 'string' &&
    (src.startsWith('/api/') || !src.startsWith('/'));

  const hasExplicitSize = typeof width === 'number' && typeof height === 'number';
  const useFill = fill === true || !hasExplicitSize;

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
      } catch {
        // Ignore invalid blur hash.
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
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-500',
            isLoaded ? 'opacity-0' : 'pointer-events-none opacity-100',
          )}
        />
      )}
      <Image
        src={src}
        alt={alt}
        className={cn(
          'transition-opacity duration-500',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className,
        )}
        unoptimized={shouldBypassOptimization}
        onLoadingComplete={(img) => {
          setIsLoaded(true);
          onLoadingComplete?.(img);
        }}
        onError={() => {
          setIsLoaded(true);
        }}
        {...(useFill
          ? { fill: true, sizes: sizes ?? '100vw' }
          : { width, height, sizes })}
        {...props}
      />
    </>
  );
}