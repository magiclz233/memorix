'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  /** BlurHash 占位符字符串 */
  blurHash?: string | null;
  width: number;
  height: number;
  /** 是否优先加载（LCP 图片设为 true） */
  priority?: boolean;
  /** 响应式尺寸描述 */
  sizes?: string;
  className?: string;
  /** 图片加载完成回调 */
  onLoad?: () => void;
  /** 图片点击回调 */
  onClick?: () => void;
  fill?: boolean;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

/**
 * 优化图片组件
 * - 集成 BlurHash 占位符，避免 CLS
 * - 图片加载完成后淡入显示
 * - 使用 Next.js Image 实现懒加载和响应式图片
 */
export function OptimizedImage({
  src,
  alt,
  blurHash,
  width,
  height,
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  className,
  onLoad,
  onClick,
  fill = false,
  objectFit = 'cover',
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      onClick={onClick}
      style={!fill ? { width, height } : undefined}
    >
      {/* BlurHash 占位符（CSS 渐变模拟，避免引入额外依赖） */}
      {blurHash && !isLoaded && (
        <div
          className="absolute inset-0 animate-pulse bg-zinc-200 dark:bg-zinc-800"
          aria-hidden="true"
        />
      )}

      {/* Next.js Image 组件 */}
      <Image
        src={src}
        alt={alt}
        {...(fill ? { fill: true } : { width, height })}
        sizes={sizes}
        priority={priority}
        quality={90}
        onLoad={handleLoad}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          fill && `object-${objectFit}`,
        )}
        placeholder={blurHash ? 'blur' : 'empty'}
        blurDataURL={
          blurHash
            ? `data:image/svg+xml;base64,${btoa(
                `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#e4e4e7"/></svg>`,
              )}`
            : undefined
        }
      />
    </div>
  );
}
