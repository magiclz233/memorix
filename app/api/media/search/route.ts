import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import {
  fetchMediaLibraryPage,
  fetchUserStorages,
  type MediaLibrarySort,
} from '@/app/lib/data';
import { getSessionUserId } from '@/app/lib/session-user';

const parsePositiveInteger = (
  value: string | null,
  fallback: number,
  maximum = Number.MAX_SAFE_INTEGER,
) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0
    ? Math.min(parsed, maximum)
    : fallback;
};

const parseStorageId = (value: string | null) => {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
};

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = getSessionUserId(session);

  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = parsePositiveInteger(url.searchParams.get('page'), 1, 1_000_000);
  const perPage = parsePositiveInteger(url.searchParams.get('limit'), 24, 100);

  const storages = await fetchUserStorages(userId);
  const category = url.searchParams.get('category') || 'all';
  const storageId = parseStorageId(url.searchParams.get('storageId'));

  const categoryStorageIds =
    category === 'all' ? [] : storages.filter((s) => s.type === category).map((s) => s.id);

  const storageIds = storageId > 0 ? [storageId] : categoryStorageIds;

  const mediaType =
    (url.searchParams.get('type') as 'all' | 'image' | 'video' | 'animated') || 'all';
  const publishStatus =
    (url.searchParams.get('status') as 'all' | 'published' | 'unpublished') || 'all';
  const hero = (url.searchParams.get('hero') as 'all' | 'yes' | 'no') || 'all';
  const sort = (url.searchParams.get('sort') as MediaLibrarySort) || 'dateShotDesc';

  const result = await fetchMediaLibraryPage({
    userId,
    page,
    perPage,
    filters: {
      storageIds,
      mediaType,
      publishStatus,
      keyword: url.searchParams.get('q') || undefined,
      dateFrom: url.searchParams.get('dateFrom') || undefined,
      dateTo: url.searchParams.get('dateTo') || undefined,
      hero,
      sort,
    },
  });

  return NextResponse.json(result);
}
