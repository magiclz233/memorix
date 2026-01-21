import { lusitana, spaceGrotesk } from '@/app/ui/fonts';
import { cn } from '@/lib/utils';
import { getTranslations } from 'next-intl/server';

type AboutCard = {
  title: string;
  description: string;
};

type EquipmentCard = AboutCard & {
  size?: 'wide';
};

export default async function Page() {
  const t = await getTranslations('front.about');
  const capabilities = t.raw('capabilities') as AboutCard[];
  const equipment = t.raw('equipmentItems') as EquipmentCard[];

  return (
    <div className='space-y-20'>
      <section className='front-fade-up grid gap-12 lg:grid-cols-[0.6fr_0.4fr] lg:items-start'>
        <div className='space-y-6'>
          <p className='text-xs uppercase tracking-[0.4em] text-zinc-600/80 dark:text-white/60'>
            {t('eyebrow')}
          </p>
          <h1
            className={cn(
              lusitana.className,
              'text-4xl font-semibold text-zinc-800/90 dark:text-white/85 md:text-6xl'
            )}
          >
            {t('title')}
          </h1>
          <p className='max-w-xl text-base text-zinc-600/80 dark:text-white/60'>
            {t('description')}
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
              {t('manifesto.title')}
            </h2>
            <p className='mt-3 text-sm text-zinc-600/80 dark:text-white/60'>
              {t('manifesto.description')}
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
            {t('equipmentSection.eyebrow')}
          </p>
          <h2
            className={cn(
              lusitana.className,
              'text-3xl font-semibold text-zinc-800/90 dark:text-white/85 md:text-4xl'
            )}
          >
            {t('equipmentSection.title')}
          </h2>
          <p className='max-w-2xl text-sm text-zinc-600/80 dark:text-white/60'>
            {t('equipmentSection.description')}
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
