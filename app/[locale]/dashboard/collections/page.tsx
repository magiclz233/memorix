import { headers } from 'next/headers';
import { auth } from '@/auth';
import { fetchCollections } from '@/app/lib/data';
import { CollectionsClient } from './collections-client';

export default async function Page() {
  const collections = await fetchCollections({ status: 'all' });
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const defaultAuthor =
    session?.user?.name?.trim() || session?.user?.email?.trim() || null;

  return (
    <CollectionsClient
      collections={collections}
      defaultAuthor={defaultAuthor}
    />
  );
}
