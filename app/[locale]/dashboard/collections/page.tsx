'use client';

import { useState } from 'react';
import { GripVertical, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const photoCollections = [
  {
    id: 'pc-1',
    title: 'photo.pc-1',
    count: 86,
    cover: '/hero-desktop.png',
  },
  {
    id: 'pc-2',
    title: 'photo.pc-2',
    count: 54,
    cover: '/hero-mobile.png',
  },
  {
    id: 'pc-3',
    title: 'photo.pc-3',
    count: 39,
    cover: '/hero-desktop.png',
  },
];

const videoSeries = [
  {
    id: 'vs-1',
    title: 'video.vs-1',
    episodes: 12,
    status: 'ongoing',
    cover: '/hero-mobile.png',
  },
  {
    id: 'vs-2',
    title: 'video.vs-2',
    episodes: 6,
    status: 'completed',
    cover: '/hero-desktop.png',
  },
  {
    id: 'vs-3',
    title: 'video.vs-3',
    episodes: 8,
    status: 'planning',
    cover: '/hero-mobile.png',
  },
];

export default function Page() {
  const t = useTranslations('dashboard.collections');
  const tData = useTranslations('dashboard.data.collections');
  const [activeTab, setActiveTab] = useState<'photos' | 'videos'>('photos');

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t('title')}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t('description')}
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-full border border-zinc-200 bg-white/80 px-4 py-2 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-black/40">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('photos')}
            className={cn(
              'rounded-full px-4 py-1 text-sm transition',
              activeTab === 'photos'
                ? 'bg-indigo-500 text-white shadow'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100',
            )}
          >
            {t('tabs.photos')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('videos')}
            className={cn(
              'rounded-full px-4 py-1 text-sm transition',
              activeTab === 'videos'
                ? 'bg-indigo-500 text-white shadow'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100',
            )}
          >
            {t('tabs.videos')}
          </button>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          {t('create')}
        </Button>
      </div>

      {activeTab === 'photos' ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {photoCollections.map((collection) => (
            <div
              key={collection.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm transition-all hover:shadow-md dark:border-white/10 dark:bg-zinc-900/50 dark:backdrop-blur-md"
            >
              <div className="overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800/50">
                <img
                  src={collection.cover}
                  alt={tData(collection.title)}
                  className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="mt-4 space-y-2">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  {tData(collection.title)}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {t('photoItem.count', { count: collection.count })}
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  {t('photoItem.manage')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {videoSeries.map((series) => (
            <div
              key={series.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm transition-all hover:shadow-md dark:border-white/10 dark:bg-zinc-900/50 dark:backdrop-blur-md"
            >
              <div className="flex items-center gap-3">
                <GripVertical className="h-5 w-5 text-zinc-400" />
                <div className="h-16 w-24 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800/50">
                  <img
                    src={series.cover}
                    alt={tData(series.title)}
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    loading="lazy"
                  />
                </div>
              </div>
              <div className="min-w-[200px] flex-1 space-y-1">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  {tData(series.title)}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  <span className="font-mono">{t('videoItem.episodes', { count: series.episodes })}</span> · {t(`status.${series.status}`)}
                </p>
              </div>
              <Button variant="outline" size="sm">
                {t('videoItem.edit')}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}