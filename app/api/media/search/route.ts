import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import {
  fetchMediaLibraryPage,
  fetchUserByEmail,
  fetchUserStorages,
  type MediaLibrarySort,
} from '@/app/lib/data';

const parseNumber = (value: string | null, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user?.email ?? null;

  if (!email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const user = await fetchUserByEmail(email);
  if (!user) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  const url = new URL(request.url);
  const page = parseNumber(url.searchParams.get('page'), 1);
  const perPage = parseNumber(url.searchParams.get('limit'), 24);

  const storages = await fetchUserStorages(user.id);
  const category = url.searchParams.get('category') || 'all';
  const storageId = parseNumber(url.searchParams.get('storageId'), 0);

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
    userId: user.id,
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
