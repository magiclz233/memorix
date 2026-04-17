/**
 * 画廊相关组件的动态导入
 * 减少初始 bundle 大小，提升首屏加载速度
 */
import dynamic from 'next/dynamic';

/** 动态导入虚拟滚动画廊网格（仅客户端） */
export const DynamicVirtualGalleryGrid = dynamic(
  () =>
    import('./virtual-gallery-grid').then((mod) => mod.VirtualGalleryGrid),
  {
    ssr: false,
    loading: () => null,
  },
);
