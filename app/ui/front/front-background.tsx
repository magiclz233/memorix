'use client';

/**
 * Lumina Pro 氛围背景：
 * - Light Mode：保持极简杂志风高纯净留白，仅顶部极淡柔和光感；
 * - Dark Mode：深邃 zinc-950 底色叠加克制的 indigo/violet 顶光晕染；
 * - 纯 CSS 零动画开销，不创建多余 <main> 地标。
 */
export function FrontBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute -top-40 left-1/2 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-indigo-500/[0.06] blur-3xl dark:bg-indigo-500/[0.14]" />
      <div className="absolute -top-24 right-[-10%] h-[320px] w-[480px] rounded-full bg-violet-500/[0.04] blur-3xl dark:bg-violet-500/[0.10]" />
    </div>
  );
}
