'use client';

import { useState, useTransition } from 'react';
import { GripVertical, Plus, MoreHorizontal, Pencil, Trash, Images } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CollectionForm, CollectionFormData } from '@/app/ui/dashboard/collection-form';
import { deleteCollection, deleteVideoSeries } from '@/app/lib/actions/collections';
import { Link, useRouter } from '@/i18n/navigation';

type PhotoCollection = {
  id: number;
  title: string;
  description: string | null;
  coverImage: string | null;
  createdAt: Date;
  itemCount: number;
};

type VideoSeries = {
  id: number;
  title: string;
  description: string | null;
  coverImage: string | null;
  createdAt: Date;
  updatedAt: Date;
  itemCount: number;
};

type CollectionsClientProps = {
  photoCollections: PhotoCollection[];
  videoSeries: VideoSeries[];
};

export function CollectionsClient({
  photoCollections,
  videoSeries,
}: CollectionsClientProps) {
  const t = useTranslations('dashboard.collections');
  const [activeTab, setActiveTab] = useState<'photos' | 'videos'>('photos');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CollectionFormData | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCreate = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (item: PhotoCollection | VideoSeries) => {
    setEditingItem({
      id: item.id,
      title: item.title,
      description: item.description || '',
      coverImage: item.coverImage || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number, type: 'photo' | 'video') => {
    if (!confirm(t('deleteConfirm'))) return;

    startTransition(async () => {
      if (type === 'photo') {
        await deleteCollection(id);
      } else {
        await deleteVideoSeries(id);
      }
      router.refresh();
    });
  };

  const handleSuccess = () => {
    setIsDialogOpen(false);
    router.refresh();
  };

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

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'photos' | 'videos')}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-full border border-zinc-200 bg-white/80 px-4 py-2 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-black/40">
          <TabsList className="bg-transparent p-0">
            <TabsTrigger
              value="photos"
              className="rounded-full px-4 py-1 text-sm transition data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {t('tabs.photos')}
            </TabsTrigger>
            <TabsTrigger
              value="videos"
              className="rounded-full px-4 py-1 text-sm transition data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {t('tabs.videos')}
            </TabsTrigger>
          </TabsList>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t('create')}
          </Button>
        </div>

        <TabsContent value="photos" className="mt-6">
          {photoCollections.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 py-16 text-center dark:border-zinc-800">
              <Images className="h-10 w-10 text-zinc-400" />
              <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {t('empty.title')}
              </h3>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                {t('empty.description')}
              </p>
              <Button className="mt-6" onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                {t('create')}
              </Button>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {photoCollections.map((collection) => (
                <div
                  key={collection.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm transition-all hover:shadow-md dark:border-white/10 dark:bg-zinc-900/50 dark:backdrop-blur-md"
                >
                  <div className="absolute right-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 bg-white/50 backdrop-blur hover:bg-white/80 dark:bg-black/50 dark:hover:bg-black/80"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(collection)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          {t('actions.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => handleDelete(collection.id, 'photo')}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          {t('actions.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="relative h-40 w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800/50">
                    {collection.coverImage ? (
                      <Image
                        src={collection.coverImage}
                        alt={collection.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
                        <Images className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="mt-4 space-y-2">
                    <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                      {collection.title}
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {t('photoItem.count', { count: collection.itemCount })}
                    </p>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link href={`/dashboard/collections/photo/${collection.id}`}>
                        {t('photoItem.manage')}
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="videos" className="mt-6">
          {videoSeries.length === 0 ? (
             <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 py-16 text-center dark:border-zinc-800">
             <Images className="h-10 w-10 text-zinc-400" />
             <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
               {t('empty.title')}
             </h3>
             <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
               {t('empty.description')}
             </p>
             <Button className="mt-6" onClick={handleCreate}>
               <Plus className="mr-2 h-4 w-4" />
               {t('create')}
             </Button>
           </div>
          ) : (
            <div className="space-y-4">
              {videoSeries.map((series) => (
                <div
                  key={series.id}
                  className="group relative flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm transition-all hover:shadow-md dark:border-white/10 dark:bg-zinc-900/50 dark:backdrop-blur-md"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-5 w-5 text-zinc-400" />
                    <div className="relative h-16 w-24 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800/50">
                      {series.coverImage ? (
                        <Image
                          src={series.coverImage}
                          alt={series.title}
                          fill
                          className="object-cover transition-transform duration-500 hover:scale-105"
                          sizes="96px"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
                          <Images className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="min-w-[200px] flex-1 space-y-1">
                    <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                      {series.title}
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      <span className="font-mono">
                        {t('videoItem.episodes', { count: series.itemCount })}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                        {t('videoItem.edit')}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(series)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          {t('actions.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => handleDelete(series.id, 'video')}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          {t('actions.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem
                ? t(activeTab === 'photos' ? 'form.editPhoto' : 'form.editVideo')
                : t(activeTab === 'photos' ? 'form.createPhoto' : 'form.createVideo')}
            </DialogTitle>
            <DialogDescription>
               {t('form.description')}
            </DialogDescription>
          </DialogHeader>
          <CollectionForm
            type={activeTab === 'photos' ? 'photo' : 'video'}
            initialData={editingItem}
            onSuccess={handleSuccess}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
