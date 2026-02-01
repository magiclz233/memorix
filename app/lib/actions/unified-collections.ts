'use server';

import { z } from 'zod';
import { db } from '../drizzle';
import { collectionMedia, collections, files } from '../schema';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { revalidatePathForAllLocales } from '../revalidate';
import { auth } from '@/auth';
import { headers } from 'next/headers';
import { fetchPublishedMediaForGallery } from '../data';

const CollectionSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().optional().or(z.literal('')),
  author: z.string().trim().optional().or(z.literal('')),
  type: z.enum(['mixed', 'photo', 'video']).default('mixed'),
  status: z.enum(['draft', 'published']).default('draft'),
  coverFileId: z.preprocess((value) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }, z.number().int().positive().optional()),
});

const requireAdmin = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  if ((session.user as { role?: string }).role !== 'admin') {
    throw new Error('Forbidden');
  }
  return session.user;
};

const normalizeText = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveAuthor = (
  input: string | null,
  user: { name?: string | null; email?: string | null },
  useFallback: boolean,
) => {
  if (input) return input;
  if (!useFallback) return null;
  const fallback = (user.name ?? user.email ?? '').trim();
  return fallback.length > 0 ? fallback : null;
};

const getAllowedMediaTypes = (type: 'mixed' | 'photo' | 'video') => {
  if (type === 'photo') return ['image', 'animated'];
  if (type === 'video') return ['video'];
  return ['image', 'animated', 'video'];
};

export async function createCollection(formData: FormData) {
  const user = await requireAdmin();

  const parsed = CollectionSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    author: formData.get('author'),
    type: formData.get('type'),
    status: formData.get('status'),
    coverFileId: formData.get('coverFileId'),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Collection.',
    };
  }

  const { title, description, author, type, status, coverFileId } = parsed.data;

  try {
    await db.insert(collections).values({
      title,
      description: normalizeText(description),
      author: resolveAuthor(normalizeText(author), user, true),
      coverFileId: coverFileId ?? null,
      type,
      status,
      createdBy: typeof user.id === 'number' ? user.id : null,
      updatedBy: typeof user.id === 'number' ? user.id : null,
    });
  } catch (error) {
    console.error('Database Error:', error);
    return { message: 'Database Error: Failed to Create Collection.' };
  }

  revalidatePathForAllLocales('/dashboard/collections');
  revalidatePathForAllLocales('/collections');
}

export async function updateCollection(id: number, formData: FormData) {
  const user = await requireAdmin();

  const parsed = CollectionSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    author: formData.get('author'),
    type: formData.get('type'),
    status: formData.get('status'),
    coverFileId: formData.get('coverFileId'),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Collection.',
    };
  }

  const { title, description, author, type, status, coverFileId } = parsed.data;

  try {
    await db
      .update(collections)
      .set({
        title,
        description: normalizeText(description),
        author: resolveAuthor(normalizeText(author), user, false),
        coverFileId: coverFileId ?? null,
        type,
        status,
        updatedBy: typeof user.id === 'number' ? user.id : null,
        updatedAt: new Date(),
      })
      .where(eq(collections.id, id));
  } catch (error) {
    console.error('Database Error:', error);
    return { message: 'Database Error: Failed to Update Collection.' };
  }

  revalidatePathForAllLocales('/dashboard/collections');
  revalidatePathForAllLocales(`/dashboard/collections/${id}`);
  revalidatePathForAllLocales('/collections');
  revalidatePathForAllLocales(`/collections/${id}`);
}

export async function deleteCollection(id: number) {
  await requireAdmin();

  try {
    await db.transaction(async (tx) => {
      await tx
        .delete(collectionMedia)
        .where(eq(collectionMedia.collectionId, id));
      await tx.delete(collections).where(eq(collections.id, id));
    });
  } catch (error) {
    console.error('Database Error:', error);
    return { message: 'Database Error: Failed to Delete Collection.' };
  }

  revalidatePathForAllLocales('/dashboard/collections');
  revalidatePathForAllLocales('/collections');
}

export async function addMediaToCollection(
  collectionId: number,
  fileIds: number[],
) {
  await requireAdmin();

  if (fileIds.length === 0) return;

  const collection = await db.query.collections.findFirst({
    where: eq(collections.id, collectionId),
  });

  if (!collection) {
    return { message: 'Collection not found.' };
  }

  const uniqueIds = Array.from(new Set(fileIds));
  const allowedTypes = getAllowedMediaTypes(
    collection.type as 'mixed' | 'photo' | 'video',
  );

  const allowedFiles = await db
    .select({ id: files.id })
    .from(files)
    .where(
      and(inArray(files.id, uniqueIds), inArray(files.mediaType, allowedTypes)),
    );

  if (allowedFiles.length !== uniqueIds.length) {
    return { message: 'Invalid media type for this collection.' };
  }

  try {
    const existing = await db
      .select({ fileId: collectionMedia.fileId })
      .from(collectionMedia)
      .where(eq(collectionMedia.collectionId, collectionId));
    const existingIds = new Set(existing.map((item) => item.fileId));
    const filteredIds = uniqueIds.filter((id) => !existingIds.has(id));
    if (filteredIds.length === 0) return;

    const lastOrder = await db
      .select({ sortOrder: collectionMedia.sortOrder })
      .from(collectionMedia)
      .where(eq(collectionMedia.collectionId, collectionId))
      .orderBy(desc(collectionMedia.sortOrder))
      .limit(1);
    const startOrder = (lastOrder[0]?.sortOrder ?? 0) + 1;

    await db
      .insert(collectionMedia)
      .values(
        filteredIds.map((fileId, index) => ({
          collectionId,
          fileId,
          sortOrder: startOrder + index,
        })),
      )
      .onConflictDoNothing();
  } catch (error) {
    console.error('Database Error:', error);
    return { message: 'Database Error: Failed to Add Media.' };
  }

  revalidatePathForAllLocales(`/dashboard/collections/${collectionId}`);
  revalidatePathForAllLocales(`/collections/${collectionId}`);
}

export async function removeMediaFromCollection(
  collectionId: number,
  fileIds: number[],
) {
  await requireAdmin();

  try {
    await db.transaction(async (tx) => {
      await tx
        .delete(collectionMedia)
        .where(
          and(
            eq(collectionMedia.collectionId, collectionId),
            inArray(collectionMedia.fileId, fileIds),
          ),
        );

      const remaining = await tx
        .select({ fileId: collectionMedia.fileId })
        .from(collectionMedia)
        .where(eq(collectionMedia.collectionId, collectionId))
        .orderBy(asc(collectionMedia.sortOrder));

      for (let i = 0; i < remaining.length; i += 1) {
        await tx
          .update(collectionMedia)
          .set({ sortOrder: i + 1 })
          .where(
            and(
              eq(collectionMedia.collectionId, collectionId),
              eq(collectionMedia.fileId, remaining[i].fileId),
            ),
          );
      }
    });
  } catch (error) {
    console.error('Database Error:', error);
    return { message: 'Database Error: Failed to Remove Media.' };
  }

  revalidatePathForAllLocales(`/dashboard/collections/${collectionId}`);
  revalidatePathForAllLocales(`/collections/${collectionId}`);
}

export async function reorderMedia(
  collectionId: number,
  items: { fileId: number; sortOrder: number }[],
) {
  await requireAdmin();

  try {
    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(collectionMedia)
          .set({ sortOrder: item.sortOrder })
          .where(
            and(
              eq(collectionMedia.collectionId, collectionId),
              eq(collectionMedia.fileId, item.fileId),
            ),
          );
      }
    });
  } catch (error) {
    console.error('Database Error:', error);
    return { message: 'Database Error: Failed to Reorder Media.' };
  }

  revalidatePathForAllLocales(`/dashboard/collections/${collectionId}`);
  revalidatePathForAllLocales(`/collections/${collectionId}`);
}

export async function fetchMediaForPicker(
  page = 1,
  limit = 24,
  mediaTypes?: Array<'image' | 'video' | 'animated'>,
) {
  await requireAdmin();

  const offset = (page - 1) * limit;
  return fetchPublishedMediaForGallery({ limit, offset, mediaTypes });
}
