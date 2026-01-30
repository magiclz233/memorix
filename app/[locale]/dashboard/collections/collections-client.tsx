'use client';

import { useState, useTransition } from 'react';
import { GripVertical, Plus, MoreHorizontal, Pencil, Trash, Images, ArrowLeft } from 'lucide-react';
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
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t('title')}
          </h1>
          <p className="text-base text-zinc-500 dark:text-zinc-400">
            {t('description')}
          </p>
        </div>
        <Button onClick={handleCreate} className="shadow-lg shadow-indigo-500/20">
          <Plus className="mr-2 h-4 w-4" />
          {t('create')}
        </Button>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'photos' | 'videos')}
        className="space-y-8"
      >
        <div className="flex items-center justify-center pb-6">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2 rounded-full bg-zinc-100 p-1 dark:bg-zinc-800">
            <TabsTrigger
              value="photos"
              className="rounded-full px-8 py-2 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-zinc-950 dark:data-[state=active]:text-indigo-400"
            >
              {t('tabs.photos')}
            </TabsTrigger>
            <TabsTrigger
              value="videos"
              className="rounded-full px-8 py-2 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-zinc-950 dark:data-[state=active]:text-indigo-400"
            >
              {t('tabs.videos')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="photos" className="space-y-6">
          {photoCollections.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/50 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <Images className="h-10 w-10 text-zinc-400" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                {t('empty.title')}
              </h3>
              <p className="mt-2 max-w-sm text-zinc-500 dark:text-zinc-400">
                {t('empty.description')}
              </p>
              <Button className="mt-8" onClick={handleCreate} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                {t('create')}
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {photoCollections.map((collection) => (
                <div
                  key={collection.id}
                  className="group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-xl hover:shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:shadow-black/50"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    {collection.coverImage ? (
                      <Image
                        src={collection.coverImage}
                        alt={collection.title}
                        width={600}
                        height={450}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-300 dark:text-zinc-700">
                        <Images className="h-12 w-12" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </div>

                  <Link 
                    href={`/dashboard/collections/photo/${collection.id}`} 
                    className="absolute inset-0 z-10"
                    aria-label={t('photoItem.manage')}
                  />

                  <div className="absolute right-3 top-3 z-20 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-white/90 shadow-sm backdrop-blur hover:bg-white dark:bg-black/50 dark:hover:bg-black/80"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(collection); }}>
                          <Pencil className="mr-2 h-4 w-4" />
                          {t('actions.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600 dark:text-red-400"
                          onClick={(e) => { e.stopPropagation(); handleDelete(collection.id, 'photo'); }}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          {t('actions.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="pointer-events-none relative p-5">
                    <div className="mb-2 flex items-center justify-between">
                       <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
                          {t('photoItem.count', { count: collection.itemCount })}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {new Date(collection.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                    <h3 className="line-clamp-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      {collection.title}
                    </h3>
                    {collection.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                        {collection.description}
                      </p>
                    )}
                    
                    <div className="mt-4 flex items-center text-sm font-medium text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-indigo-400">
                        {t('photoItem.manage')}
                        <ArrowLeft className="ml-1 h-4 w-4 rotate-180 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="videos" className="space-y-6">
          {videoSeries.length === 0 ? (
             <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/50 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
             <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
               <Images className="h-10 w-10 text-zinc-400" />
             </div>
             <h3 className="mt-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
               {t('empty.title')}
             </h3>
             <p className="mt-2 max-w-sm text-zinc-500 dark:text-zinc-400">
               {t('empty.description')}
             </p>
             <Button className="mt-8" onClick={handleCreate} variant="outline">
               <Plus className="mr-2 h-4 w-4" />
               {t('create')}
             </Button>
           </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {videoSeries.map((series) => (
                <div
                  key={series.id}
                  className="group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-xl hover:shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:shadow-black/50"
                >
                  <div className="aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    {series.coverImage ? (
                      <Image
                        src={series.coverImage}
                        alt={series.title}
                         width={600}
                        height={338}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-300 dark:text-zinc-700">
                        <Images className="h-12 w-12" />
                      </div>
                    )}
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </div>

                  <Link 
                    href={`/dashboard/collections/video/${series.id}`} 
                    className="absolute inset-0 z-10"
                    aria-label={t('videoItem.edit')}
                  />

                  <div className="absolute right-3 top-3 z-20 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-white/90 shadow-sm backdrop-blur hover:bg-white dark:bg-black/50 dark:hover:bg-black/80"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(series); }}>
                          <Pencil className="mr-2 h-4 w-4" />
                          {t('actions.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600 dark:text-red-400"
                          onClick={(e) => { e.stopPropagation(); handleDelete(series.id, 'video'); }}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          {t('actions.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                   <div className="pointer-events-none relative p-5">
                    <div className="mb-2 flex items-center justify-between">
                       <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
                          {t('videoItem.episodes', { count: series.itemCount })}
                        </span>
                         <span className="text-xs text-zinc-400">
                          {new Date(series.updatedAt).toLocaleDateString()}
                        </span>
                    </div>
                    <h3 className="line-clamp-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      {series.title}
                    </h3>
                    {series.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                        {series.description}
                      </p>
                    )}
                    
                     <div className="mt-4 flex items-center text-sm font-medium text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-indigo-400">
                        {t('videoItem.edit')}
                         <ArrowLeft className="ml-1 h-4 w-4 rotate-180 transition-transform group-hover:translate-x-1" />
                    </div>
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
