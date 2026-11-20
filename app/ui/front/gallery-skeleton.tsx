import { GalleryHeader } from '@/app/ui/front/gallery-header';

export function GallerySkeleton() {
  return (
    <section className="pb-24">
      <div className="relative space-y-8 w-full">
        {/* 静态标题 */}
        <GalleryHeader />

        {/* Filters Skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2 rounded-full border border-zinc-200 bg-white px-2 py-2 text-sm shadow-sm backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-8 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse"
              />
            ))}
          </div>
        </div>

        {/* Grid Skeleton — 高度用确定性序列（禁止 Math.random()，否则 SSR/CSR
            两套随机值不同会触发 hydration mismatch 告警）。列错落仅为视觉，固定即可。 */}
        <div className="flex gap-4">
          {[1, 2, 3, 4].map((col) => (
            <div key={col} className="flex min-w-0 flex-1 flex-col gap-4">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="w-full overflow-hidden rounded-2xl border border-border bg-card"
                  style={{
                    // 确定性：由列号 + 行号推出，两端渲染结果一致
                    height: `${220 + ((col * 3 + item) % 5) * 40}px`,
                  }}
                >
                  <div className="h-full w-full bg-muted animate-pulse" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
