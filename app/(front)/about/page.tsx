import { spaceGrotesk } from '@/app/ui/fonts';
import { cn } from '@/lib/utils';

const capabilities = [
  {
    title: '视觉叙事',
    description: '将拍摄、剪辑与调色串成统一的叙事节奏。',
  },
  {
    title: '空间构图',
    description: '强调层次与留白的平衡，让画面更具呼吸感。',
  },
  {
    title: '动态实验',
    description: '用光轨与长曝光建立流动的视觉语言。',
  },
  {
    title: '品牌影像',
    description: '为品牌打造可延展的视觉档案与传播素材。',
  },
];

export default function Page() {
  return (
    <div className='space-y-16'>
      <section className='front-fade-up grid gap-10 lg:grid-cols-[0.45fr_0.55fr] lg:items-center'>
        <div className='space-y-6'>
          <div className='relative h-40 w-40 overflow-hidden rounded-full border border-white/20 bg-gradient-to-br from-slate-200/80 via-slate-100 to-white shadow-lg dark:from-slate-700 dark:via-slate-900 dark:to-slate-950'>
            <div className='absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.35),transparent_60%)]' />
            <span className='relative z-10 flex h-full w-full items-center justify-center text-2xl font-semibold text-slate-800 dark:text-white'>
              NS
            </span>
          </div>
          <div className='space-y-3'>
            <p className='text-xs uppercase tracking-[0.4em] text-muted-foreground'>
              About / Studio
            </p>
            <h1
              className={cn(
                spaceGrotesk.className,
                'text-4xl font-semibold text-foreground md:text-5xl'
              )}
            >
              Nebula Studio
            </h1>
            <p className='text-sm text-muted-foreground'>
              以宇宙感视觉作为主线，将摄影与动态影像融合为统一的视觉档案。专注于冷调、光晕与玻璃质感，强调氛围与情绪的延展。
            </p>
          </div>
        </div>
        <div className='space-y-6'>
          <div className='rounded-3xl border border-slate-200/70 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-none'>
            <h2 className='text-lg font-semibold text-foreground'>
              工作室宣言
            </h2>
            <p className='mt-3 text-sm text-muted-foreground'>
              我们将每一次拍摄看作一次行星探索，通过影像记录不可复制的光线轨迹，并把它们整理成可持续更新的视觉档案。
            </p>
          </div>
          <div className='grid gap-4 md:grid-cols-2'>
            {capabilities.map((item) => (
              <div
                key={item.title}
                className='rounded-2xl border border-slate-200/70 bg-white/70 p-5 text-sm text-muted-foreground shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-white/5 dark:shadow-none'
              >
                <h3 className='text-base font-semibold text-foreground'>
                  {item.title}
                </h3>
                <p className='mt-2'>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
