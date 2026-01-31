'use client';

import { useState, useTransition } from 'react';
import { 
  GripVertical, 
  Plus, 
  MoreHorizontal, 
  Pencil, 
  Trash, 
  Images, 
  ArrowLeft,
  LayoutGrid,
  List as ListIcon,
  Search,
  ArrowUpDown,
  Image as ImageIcon,
  Film
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CollectionForm, CollectionFormData } from '@/app/ui/dashboard/collection-form';
import { deleteCollection, deleteVideoSeries } from '@/app/lib/actions/collections';
import { Link, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CollectionFormData | null>(null);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  // Stats calculation
  const totalPhotos = photoCollections.reduce((acc, curr) => acc + curr.itemCount, 0);
  const totalVideos = videoSeries.reduce((acc, curr) => acc + curr.itemCount, 0);

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

  const filteredPhotos = photoCollections.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredVideos = videoSeries.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header & Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="col-span-full space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t('title')}
          </h1>
          <p className="text-base text-zinc-500 dark:text-zinc-400">
            {t('description')}
          </p>
        </div>
        
        {/* Stat Cards */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Images className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Photos</p>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{totalPhotos}</h3>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
              <Film className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Videos</p>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{totalVideos}</h3>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              <LayoutGrid className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Collections</p>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{photoCollections.length + videoSeries.length}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Controls & Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'photos' | 'videos')}
        className="space-y-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="w-fit rounded-full bg-zinc-100 p-1 dark:bg-zinc-800">
            <TabsTrigger
              value="photos"
              className="rounded-full px-6 transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-zinc-950"
            >
              {t('tabs.photos')}
            </TabsTrigger>
            <TabsTrigger
              value="videos"
              className="rounded-full px-6 transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-zinc-950"
            >
              {t('tabs.videos')}
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Search collections..."
                className="w-[200px] rounded-full pl-9 md:w-[300px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8 rounded-md"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8 rounded-md"
                onClick={() => setViewMode('list')}
              >
                <ListIcon className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={handleCreate} className="rounded-full shadow-lg shadow-indigo-500/20">
              <Plus className="mr-2 h-4 w-4" />
              {t('create')}
            </Button>
          </div>
        </div>

        {/* Content - Photos */}
        <TabsContent value="photos" className="space-y-6">
          {filteredPhotos.length === 0 ? (
            <EmptyState t={t} handleCreate={handleCreate} />
          ) : viewMode === 'grid' ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredPhotos.map((collection) => (
                <CollectionGridItem
                  key={collection.id}
                  item={collection}
                  type="photo"
                  t={t}
                  onEdit={() => handleEdit(collection)}
                  onDelete={() => handleDelete(collection.id, 'photo')}
                />
              ))}
            </div>
          ) : (
            <CollectionListView 
              items={filteredPhotos} 
              type="photo" 
              t={t}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </TabsContent>

        {/* Content - Videos */}
        <TabsContent value="videos" className="space-y-6">
          {filteredVideos.length === 0 ? (
            <EmptyState t={t} handleCreate={handleCreate} />
          ) : viewMode === 'grid' ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredVideos.map((series) => (
                <CollectionGridItem
                  key={series.id}
                  item={series}
                  type="video"
                  t={t}
                  onEdit={() => handleEdit(series)}
                  onDelete={() => handleDelete(series.id, 'video')}
                />
              ))}
            </div>
          ) : (
            <CollectionListView 
              items={filteredVideos} 
              type="video" 
              t={t}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog */}
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

// Subcomponents for cleaner code
function EmptyState({ t, handleCreate }: { t: any, handleCreate: () => void }) {
  return (
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
  );
}

function CollectionGridItem({ 
  item, 
  type, 
  t, 
  onEdit, 
  onDelete 
}: { 
  item: any, 
  type: 'photo' | 'video', 
  t: any, 
  onEdit: () => void, 
  onDelete: () => void 
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-xl hover:shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:shadow-black/50">
      <div className={cn("w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800", type === 'photo' ? "aspect-[4/3]" : "aspect-video")}>
        {item.coverImage ? (
          <Image
            src={item.coverImage}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-300 dark:text-zinc-700">
            {type === 'photo' ? <Images className="h-12 w-12" /> : <Film className="h-12 w-12" />}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      <Link 
        href={`/dashboard/collections/${type}/${item.id}`} 
        className="absolute inset-0 z-10"
        aria-label={t(type === 'photo' ? 'photoItem.manage' : 'videoItem.edit')}
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
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('actions.edit')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 dark:text-red-400"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
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
            {type === 'photo' ? t('photoItem.count', { count: item.itemCount }) : t('videoItem.episodes', { count: item.itemCount })}
          </span>
          <span className="text-xs text-zinc-400">
            {new Date(item.createdAt).toLocaleDateString()}
          </span>
        </div>
        <h3 className="line-clamp-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {item.title}
        </h3>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
            {item.description}
          </p>
        )}
        
        <div className="mt-4 flex items-center text-sm font-medium text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-indigo-400">
          {type === 'photo' ? t('photoItem.manage') : t('videoItem.edit')}
          <ArrowLeft className="ml-1 h-4 w-4 rotate-180 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </div>
  );
}

function CollectionListView({ 
  items, 
  type, 
  t, 
  onEdit, 
  onDelete 
}: { 
  items: any[], 
  type: 'photo' | 'video', 
  t: any, 
  onEdit: (item: any) => void, 
  onDelete: (id: number, type: 'photo' | 'video') => void 
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Cover</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className="group">
              <TableCell>
                <div className="relative h-12 w-16 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
                  {item.coverImage ? (
                    <Image
                      src={item.coverImage}
                      alt={item.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      {type === 'photo' ? <ImageIcon className="h-4 w-4 text-zinc-300" /> : <Film className="h-4 w-4 text-zinc-300" />}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="font-medium">
                <Link 
                  href={`/dashboard/collections/${type}/${item.id}`}
                  className="hover:underline hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  {item.title}
                </Link>
                {item.description && (
                  <p className="line-clamp-1 text-xs text-zinc-500">{item.description}</p>
                )}
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                  {item.itemCount}
                </span>
              </TableCell>
              <TableCell className="text-zinc-500">
                {new Date(item.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-500 hover:text-indigo-600"
                    onClick={() => onEdit(item)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-500 hover:text-red-600"
                    onClick={() => onDelete(item.id, type)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                  <Link href={`/dashboard/collections/${type}/${item.id}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-indigo-600">
                      <ArrowLeft className="h-4 w-4 rotate-180" />
                    </Button>
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
