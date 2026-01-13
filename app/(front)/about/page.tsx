import { lusitana, spaceGrotesk } from '@/app/ui/fonts';
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

const equipment = [
  {
    title: '主力机身',
    description: 'Leica M11 / Sony A7R V，专注细节与肤色层次。',
    size: 'wide',
  },
  {
    title: '电影机',
    description: 'Sony FX3 + Atomos，记录更稳定的动态范围。',
  },
  {
    title: '镜头组',
    description: '35mm / 50mm / 85mm 定焦组合，偏爱自然视角。',
  },
  {
    title: '灯光',
    description: 'Aputure 300D + PavoTube，控制氛围与高光层次。',
    size: 'wide',
  },
  {
    title: '后期',
    description: 'DaVinci Resolve / Capture One，偏向电影质感调色。',
  },
  {
    title: '现场',
    description: '移动控光布与烟雾机，塑造空间层次。',
  },
];

export default function Page() {
  return (
    <div className='space-y-20'>
      <section className='front-fade-up grid gap-12 lg:grid-cols-[0.6fr_0.4fr] lg:items-start'>
        <div className='space-y-6'>
          <p className='text-xs uppercase tracking-[0.4em] text-zinc-600/80 dark:text-white/60'>
            About / Lumina
          </p>
          <h1
            className={cn(
              lusitana.className,
              'text-4xl font-semibold text-zinc-800/90 dark:text-white/85 md:text-6xl'
            )}
          >
            Lumina Studio
          </h1>
          <p className='max-w-xl text-base text-zinc-600/80 dark:text-white/60'>
            以极简排版承载高密度影像叙事，专注于光影与情绪的延展。在静态与动态之间，寻找更有呼吸感的视觉语言。
          </p>
        </div>
        <div className='space-y-6'>
          <div className='rounded-3xl border border-zinc-200 bg-white/80 p-6 shadow-lg shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900/60 dark:shadow-black/50'>
            <h2
              className={cn(
                spaceGrotesk.className,
                'text-lg font-semibold text-zinc-800/90 dark:text-white/85'
              )}
            >
              工作室宣言
            </h2>
            <p className='mt-3 text-sm text-zinc-600/80 dark:text-white/60'>
              我们将每一次拍摄视为一次光线实验，通过影像记录不可复制的高光与阴影，并整理成持续更新的视觉档案。
            </p>
          </div>
          <div className='grid gap-4 md:grid-cols-2'>
            {capabilities.map((item) => (
              <div
                key={item.title}
                className='rounded-2xl border border-zinc-200 bg-white/70 p-5 text-sm text-zinc-600/80 shadow-lg shadow-zinc-200/40 transition duration-300 hover:-translate-y-1 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-white/60 dark:shadow-black/40'
              >
                <h3 className='text-base font-semibold text-zinc-800/90 dark:text-white/85'>
                  {item.title}
                </h3>
                <p className='mt-2'>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className='front-fade-up space-y-6'>
        <div className='space-y-3'>
          <p className='text-xs uppercase tracking-[0.4em] text-zinc-600/80 dark:text-white/60'>
            Equipment / Bento
          </p>
          <h2
            className={cn(
              lusitana.className,
              'text-3xl font-semibold text-zinc-800/90 dark:text-white/85 md:text-4xl'
            )}
          >
            设备清单
          </h2>
          <p className='max-w-2xl text-sm text-zinc-600/80 dark:text-white/60'>
            以轻量化配置为主，保证现场机动性与光影塑形的稳定输出。
          </p>
        </div>
        <div className='grid gap-4 md:grid-cols-2'>
          {equipment.map((item) => (
            <div
              key={item.title}
              className={cn(
                'rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600/80 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-white/60',
                item.size === 'wide' && 'md:col-span-2'
              )}
            >
              <h3 className='text-base font-semibold text-zinc-800/90 dark:text-white/85'>
                {item.title}
              </h3>
              <p className='mt-2'>{item.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
