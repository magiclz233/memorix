'use client';

import { useState } from 'react';
import { GripVertical, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const photoCollections = [
  {
    id: 'pc-1',
    title: '2024 东京街头',
    count: 86,
    cover: '/hero-desktop.png',
  },
  {
    id: 'pc-2',
    title: '北欧极光计划',
    count: 54,
    cover: '/hero-mobile.png',
  },
  {
    id: 'pc-3',
    title: '城市夜航',
    count: 39,
    cover: '/hero-desktop.png',
  },
];

const videoSeries = [
  {
    id: 'vs-1',
    title: 'VLOG: 冰岛之旅',
    episodes: 12,
    status: '更新中',
    cover: '/hero-mobile.png',
  },
  {
    id: 'vs-2',
    title: '幕后制作：Lumina',
    episodes: 6,
    status: '已完结',
    cover: '/hero-desktop.png',
  },
  {
    id: 'vs-3',
    title: '旅行短片合集',
    episodes: 8,
    status: '策划中',
    cover: '/hero-mobile.png',
  },
];

export default function Page() {
  const [activeTab, setActiveTab] = useState<'photos' | 'videos'>('photos');

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          集合管理
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          统一管理图集与视频集，支持创建与编辑集合。
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
            图集
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
            视频集
          </button>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          新建集合
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
                  alt={collection.title}
                  className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="mt-4 space-y-2">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  {collection.title}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  包含 <span className="font-mono">{collection.count}</span> 张图片
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  管理图集
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
                    alt={series.title}
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    loading="lazy"
                  />
                </div>
              </div>
              <div className="min-w-[200px] flex-1 space-y-1">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  {series.title}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  <span className="font-mono">{series.episodes}</span> 集 · {series.status}
                </p>
              </div>
              <Button variant="outline" size="sm">
                编辑剧集
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
