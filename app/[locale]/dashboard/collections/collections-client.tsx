'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash,
  LayoutGrid,
  List as ListIcon,
  Search,
  Image as ImageIcon,
  Film,
  Layers,
  User,
  Play,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CollectionForm,
  CollectionFormData,
} from '@/app/ui/dashboard/collection-form';
import { deleteCollection } from '@/app/lib/actions/unified-collections';
import { Link, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { CollectionListItem } from '@/app/lib/data';

type CollectionsClientProps = {
  collections: CollectionListItem[];
  defaultAuthor?: string | null;
};

export function CollectionsClient({
  collections,
  defaultAuthor,
}: CollectionsClientProps) {
  const t = useTranslations('dashboard.collections');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CollectionFormData | null>(
    null,
  );
  const [, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<
    'all' | 'mixed' | 'photo' | 'video'
  >('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'draft' | 'published'
  >('all');
  const router = useRouter();

  const stats = useMemo(() => {
    const totalItems = collections.reduce(
      (acc, curr) => acc + curr.itemCount,
      0,
    );
    const publishedCount = collections.filter(
      (item) => item.status === 'published',
    ).length;
    return {
      totalCollections: collections.length,
      totalItems,
      publishedCount,
    };
  }, [collections]);

  const filteredCollections = collections.filter((item) => {
    const matchesSearch = item.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesStatus =
      statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleCreate = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (item: CollectionListItem) => {
    setEditingItem({
      id: item.id,
      title: item.title,
      description: item.description || '',
      author: item.author ?? '',
      type: item.type,
      status: item.status,
      coverImages: item.covers?.map((c) => c.id) ?? [],
      coverUrls: item.covers?.map((c) => c.thumbUrl || c.url || '') ?? [],
      coverThumbUrl: item.cover?.thumbUrl ?? null,
      coverMediaType:
        (item.cover?.mediaType as 'image' | 'video' | 'animated' | null) ??
        null,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (!confirm(t('deleteConfirm'))) return;

    startTransition(async () => {
      await deleteCollection(id);
      router.refresh();
    });
  };

  const handleSuccess = () => {
    setIsDialogOpen(false);
    router.refresh();
  };

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

        <StatCard
          label={t('stats.totalCollections')}
          value={stats.totalCollections}
          icon={LayoutGrid}
          tone="indigo"
        />
        <StatCard
          label={t('stats.totalItems')}
          value={stats.totalItems}
          icon={Layers}
          tone="zinc"
        />
        <StatCard
          label={t('stats.published')}
          value={stats.publishedCount}
          icon={Film}
          tone="violet"
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder={t('filters.searchPlaceholder')}
              className="w-[220px] rounded-full pl-9 md:w-[280px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(value) =>
              setTypeFilter(value as 'all' | 'mixed' | 'photo' | 'video')
            }
          >
            <SelectTrigger className="h-9 w-[160px] rounded-full">
              <SelectValue placeholder={t('filters.typePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.typeAll')}</SelectItem>
              <SelectItem value="mixed">{t('filters.typeMixed')}</SelectItem>
              <SelectItem value="photo">{t('filters.typePhoto')}</SelectItem>
              <SelectItem value="video">{t('filters.typeVideo')}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as 'all' | 'draft' | 'published')
            }
          >
            <SelectTrigger className="h-9 w-[160px] rounded-full">
              <SelectValue placeholder={t('filters.statusPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.statusAll')}</SelectItem>
              <SelectItem value="draft">{t('filters.statusDraft')}</SelectItem>
              <SelectItem value="published">
                {t('filters.statusPublished')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
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
          <Button
            onClick={handleCreate}
            className="rounded-full shadow-lg shadow-indigo-500/20"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('create')}
          </Button>
        </div>
      </div>

      {/* Content */}
      {filteredCollections.length === 0 ? (
        <EmptyState t={t} handleCreate={handleCreate} />
      ) : viewMode === 'grid' ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCollections.map((collection) => (
            <CollectionGridItem
              key={collection.id}
              item={collection}
              t={t}
              onEdit={() => handleEdit(collection)}
              onDelete={() => handleDelete(collection.id)}
            />
          ))}
        </div>
      ) : (
        <CollectionListView
          items={filteredCollections}
          t={t}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? t('form.edit') : t('form.create')}
            </DialogTitle>
            <DialogDescription>{t('form.description')}</DialogDescription>
          </DialogHeader>
          <CollectionForm
            key={`${editingItem?.id ?? 'new'}-${isDialogOpen ? 'open' : 'closed'}`}
            initialData={editingItem}
            defaultAuthor={defaultAuthor}
            onSuccess={handleSuccess}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'indigo' | 'violet' | 'zinc';
}) {
  const toneStyles =
    tone === 'indigo'
      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'
      : tone === 'violet'
        ? 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400'
        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full',
            toneStyles,
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {label}
          </p>
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {value}
          </h3>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ t, handleCreate }: { t: any; handleCreate: () => void }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/50 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
        <Layers className="h-10 w-10 text-zinc-400" />
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
  t,
  onEdit,
  onDelete,
}: {
  item: CollectionListItem;
  t: any;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const coverSrc = item.cover?.thumbUrl || item.cover?.url || '';
  const TypeIcon =
    item.type === 'video' ? Film : item.type === 'photo' ? ImageIcon : Layers;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-xl hover:shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:shadow-black/50">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        {coverSrc ? (
          <Image
            src={coverSrc}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-300 dark:text-zinc-700">
            <TypeIcon className="h-12 w-12" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Type Tag */}
        <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-zinc-800 backdrop-blur-md dark:bg-black/50 dark:text-zinc-200">
          <TypeIcon className="h-3.5 w-3.5" />
          <span>{t(`typeLabel.${item.type}`)}</span>
        </div>

        {/* Video Play Icon */}
        {item.type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="rounded-full bg-white/30 p-3 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
              <Play className="h-6 w-6 text-white" fill="currentColor" />
            </div>
          </div>
        )}
      </div>

      <Link
        href={`/dashboard/collections/${item.id}`}
        className="absolute inset-0 z-0"
        aria-label={t('actions.manage')}
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
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              {t('actions.edit')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 dark:text-red-400"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash className="mr-2 h-4 w-4" />
              {t('actions.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="pointer-events-none relative flex flex-col p-4">
        <h3 className="line-clamp-1 text-lg font-bold text-indigo-600 dark:text-indigo-400">
          {item.title}
        </h3>
        {item.description ? (
          <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
            {item.description}
          </p>
        ) : (
          <p className="mt-1 h-5" /> /* Spacer for alignment */
        )}

        <div className="mt-4 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            <span className="font-medium">{item.author || 'Unknown'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                item.status === 'published'
                  ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500',
              )}
            >
              {t(`statusLabel.${item.status}`)}
            </span>
            <span>{t('itemCount', { count: item.itemCount })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CollectionListView({
  items,
  t,
  onEdit,
  onDelete,
}: {
  items: CollectionListItem[];
  t: any;
  onEdit: (item: CollectionListItem) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">{t('table.cover')}</TableHead>
            <TableHead>{t('table.title')}</TableHead>
            <TableHead>{t('table.author')}</TableHead>
            <TableHead>{t('table.type')}</TableHead>
            <TableHead>{t('table.items')}</TableHead>
            <TableHead>{t('table.status')}</TableHead>
            <TableHead>{t('table.updatedAt')}</TableHead>
            <TableHead className="text-right">{t('table.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const coverSrc = item.cover?.thumbUrl || item.cover?.url || '';
            return (
              <TableRow key={item.id} className="group">
                <TableCell>
                  <div className="relative h-12 w-16 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
                    {coverSrc ? (
                      <Image
                        src={coverSrc}
                        alt={item.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        {item.type === 'video' ? (
                          <Film className="h-4 w-4 text-zinc-300" />
                        ) : item.type === 'photo' ? (
                          <ImageIcon className="h-4 w-4 text-zinc-300" />
                        ) : (
                          <Layers className="h-4 w-4 text-zinc-300" />
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  <Link
                    href={`/dashboard/collections/${item.id}`}
                    className="hover:underline hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    {item.title}
                  </Link>
                  {item.description ? (
                    <p className="line-clamp-1 text-xs text-zinc-500">
                      {item.description}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="text-sm text-zinc-500">
                  {item.author || '-'}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                    {t(`typeLabel.${item.type}`)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                    {item.itemCount}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                    {t(`statusLabel.${item.status}`)}
                  </span>
                </TableCell>
                <TableCell className="text-zinc-500">
                  {new Date(item.updatedAt).toLocaleDateString()}
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
                      onClick={() => onDelete(item.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
