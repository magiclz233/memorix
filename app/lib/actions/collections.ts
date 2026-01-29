'use server';

import { z } from 'zod';
import { db } from '../drizzle';
import {
  photoCollections,
  collectionItems,
  videoSeries,
  videoSeriesItems,
  files,
} from '../schema';
import { eq, inArray, and, desc, asc } from 'drizzle-orm';
import { revalidatePathForAllLocales } from '../revalidate';
import { auth } from '@/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { fetchPublishedMediaForGallery } from '../data';

// Schema definitions for validation
const CollectionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  coverImage: z.string().optional(),
});

const VideoSeriesSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  coverImage: z.string().optional(),
});

// --- Photo Collections Actions ---

export async function createCollection(formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const rawData = {
    title: formData.get('title'),
    description: formData.get('description'),
    coverImage: formData.get('coverImage'),
  };

  const validatedFields = CollectionSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Collection.',
    };
  }

  const { title, description, coverImage } = validatedFields.data;

  try {
    await db.insert(photoCollections).values({
      title,
      description: description || null,
      coverImage: coverImage || null,
    });
  } catch (error) {
    console.error('Database Error:', error);
    return {
      message: 'Database Error: Failed to Create Collection.',
    };
  }

  revalidatePathForAllLocales('/dashboard/collections');
  revalidatePathForAllLocales('/photo-collections');
}

export async function updateCollection(id: number, formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const rawData = {
    title: formData.get('title'),
    description: formData.get('description'),
    coverImage: formData.get('coverImage'),
  };

  const validatedFields = CollectionSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Collection.',
    };
  }

  const { title, description, coverImage } = validatedFields.data;

  try {
    await db
      .update(photoCollections)
      .set({
        title,
        description: description || null,
        coverImage: coverImage || null,
      })
      .where(eq(photoCollections.id, id));
  } catch (error) {
    console.error('Database Error:', error);
    return {
      message: 'Database Error: Failed to Update Collection.',
    };
  }

  revalidatePathForAllLocales('/dashboard/collections');
  revalidatePathForAllLocales('/photo-collections');
}

export async function deleteCollection(id: number) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  try {
    // Delete associated items first (if no cascade)
    await db.delete(collectionItems).where(eq(collectionItems.collectionId, id));
    await db.delete(photoCollections).where(eq(photoCollections.id, id));
  } catch (error) {
    console.error('Database Error:', error);
    return {
      message: 'Database Error: Failed to Delete Collection.',
    };
  }

  revalidatePathForAllLocales('/dashboard/collections');
  revalidatePathForAllLocales('/photo-collections');
}

export async function addItemsToCollection(
  collectionId: number,
  fileIds: number[]
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (fileIds.length === 0) return;

  try {
    const existing = await db
      .select({ fileId: collectionItems.fileId })
      .from(collectionItems)
      .where(eq(collectionItems.collectionId, collectionId));
    const existingIds = new Set(existing.map((item) => item.fileId));
    const uniqueIds = Array.from(new Set(fileIds));
    const filteredIds = uniqueIds.filter((fileId) => !existingIds.has(fileId));
    if (filteredIds.length === 0) return;

    // Get current max sort order
    const existingItems = await db
      .select({ sortOrder: collectionItems.sortOrder })
      .from(collectionItems)
      .where(eq(collectionItems.collectionId, collectionId))
      .orderBy(desc(collectionItems.sortOrder))
      .limit(1);

    let nextOrder = (existingItems[0]?.sortOrder || 0) + 1;

    const valuesToInsert = filteredIds.map((fileId, index) => ({
      collectionId,
      fileId,
      sortOrder: nextOrder + index,
    }));

    // Use onConflictDoNothing to avoid duplicates if same file added again
    await db
      .insert(collectionItems)
      .values(valuesToInsert)
      .onConflictDoNothing();
  } catch (error) {
    console.error('Database Error:', error);
    return {
      message: 'Database Error: Failed to Add Items to Collection.',
    };
  }

  revalidatePathForAllLocales('/dashboard/collections');
}

export async function removeItemsFromCollection(
  collectionId: number,
  fileIds: number[]
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  try {
    await db
      .delete(collectionItems)
      .where(
        and(
          eq(collectionItems.collectionId, collectionId),
          inArray(collectionItems.fileId, fileIds)
        )
      );
  } catch (error) {
    console.error('Database Error:', error);
    return {
      message: 'Database Error: Failed to Remove Items from Collection.',
    };
  }

  revalidatePathForAllLocales('/dashboard/collections');
}

export async function reorderCollectionItems(
  collectionId: number,
  items: { fileId: number; sortOrder: number }[]
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  try {
    // Use a transaction or Promise.all for batch updates
    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(collectionItems)
          .set({ sortOrder: item.sortOrder })
          .where(
            and(
              eq(collectionItems.collectionId, collectionId),
              eq(collectionItems.fileId, item.fileId)
            )
          );
      }
    });
  } catch (error) {
    console.error('Database Error:', error);
    return {
      message: 'Database Error: Failed to Reorder Items.',
    };
  }

  revalidatePathForAllLocales('/dashboard/collections');
}

// --- Video Series Actions ---

export async function createVideoSeries(formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const rawData = {
    title: formData.get('title'),
    description: formData.get('description'),
    coverImage: formData.get('coverImage'),
  };

  const validatedFields = VideoSeriesSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Video Series.',
    };
  }

  const { title, description, coverImage } = validatedFields.data;

  try {
    await db.insert(videoSeries).values({
      title,
      description: description || null,
      coverImage: coverImage || null,
    });
  } catch (error) {
    console.error('Database Error:', error);
    return {
      message: 'Database Error: Failed to Create Video Series.',
    };
  }

  revalidatePathForAllLocales('/dashboard/collections');
  revalidatePathForAllLocales('/video-collections');
}

export async function updateVideoSeries(id: number, formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const rawData = {
    title: formData.get('title'),
    description: formData.get('description'),
    coverImage: formData.get('coverImage'),
  };

  const validatedFields = VideoSeriesSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Video Series.',
    };
  }

  const { title, description, coverImage } = validatedFields.data;

  try {
    await db
      .update(videoSeries)
      .set({
        title,
        description: description || null,
        coverImage: coverImage || null,
        updatedAt: new Date(),
      })
      .where(eq(videoSeries.id, id));
  } catch (error) {
    console.error('Database Error:', error);
    return {
      message: 'Database Error: Failed to Update Video Series.',
    };
  }

  revalidatePathForAllLocales('/dashboard/collections');
  revalidatePathForAllLocales('/video-collections');
}

export async function deleteVideoSeries(id: number) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  try {
    await db.delete(videoSeriesItems).where(eq(videoSeriesItems.seriesId, id));
    await db.delete(videoSeries).where(eq(videoSeries.id, id));
  } catch (error) {
    console.error('Database Error:', error);
    return {
      message: 'Database Error: Failed to Delete Video Series.',
    };
  }

  revalidatePathForAllLocales('/dashboard/collections');
  revalidatePathForAllLocales('/video-collections');
}

export async function addItemsToVideoSeries(
  seriesId: number,
  fileIds: number[]
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (fileIds.length === 0) return;

  try {
    const existing = await db
      .select({ fileId: videoSeriesItems.fileId })
      .from(videoSeriesItems)
      .where(eq(videoSeriesItems.seriesId, seriesId));
    const existingIds = new Set(existing.map((item) => item.fileId));
    const uniqueIds = Array.from(new Set(fileIds));
    const filteredIds = uniqueIds.filter((fileId) => !existingIds.has(fileId));
    if (filteredIds.length === 0) return;

    const existingItems = await db
      .select({ sortOrder: videoSeriesItems.sortOrder })
      .from(videoSeriesItems)
      .where(eq(videoSeriesItems.seriesId, seriesId))
      .orderBy(desc(videoSeriesItems.sortOrder))
      .limit(1);

    let nextOrder = (existingItems[0]?.sortOrder || 0) + 1;

    const valuesToInsert = filteredIds.map((fileId, index) => ({
      seriesId,
      fileId,
      sortOrder: nextOrder + index,
    }));

    await db
      .insert(videoSeriesItems)
      .values(valuesToInsert)
      .onConflictDoNothing();
  } catch (error) {
    console.error('Database Error:', error);
    return {
      message: 'Database Error: Failed to Add Items to Video Series.',
    };
  }

  revalidatePathForAllLocales('/dashboard/collections');
}

export async function removeItemsFromVideoSeries(
  seriesId: number,
  fileIds: number[]
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  try {
    await db
      .delete(videoSeriesItems)
      .where(
        and(
          eq(videoSeriesItems.seriesId, seriesId),
          inArray(videoSeriesItems.fileId, fileIds)
        )
      );
  } catch (error) {
    console.error('Database Error:', error);
    return {
      message: 'Database Error: Failed to Remove Items from Video Series.',
    };
  }

  revalidatePathForAllLocales('/dashboard/collections');
}

export async function reorderVideoSeriesItems(
  seriesId: number,
  items: { fileId: number; sortOrder: number }[]
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  try {
    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(videoSeriesItems)
          .set({ sortOrder: item.sortOrder })
          .where(
            and(
              eq(videoSeriesItems.seriesId, seriesId),
              eq(videoSeriesItems.fileId, item.fileId)
            )
          );
      }
    });
  } catch (error) {
    console.error('Database Error:', error);
    return {
      message: 'Database Error: Failed to Reorder Items.',
    };
  }

  revalidatePathForAllLocales('/dashboard/collections');
}

export async function fetchMediaForPicker(page = 1, limit = 24) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const offset = (page - 1) * limit;
  return fetchPublishedMediaForGallery({ limit, offset });
}
