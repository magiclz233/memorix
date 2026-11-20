import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import {
  fetchSharedMedia,
  getUsableShareByToken,
  incrementShareViewCount,
} from '@/app/lib/data/shares';
import { buildGalleryItems } from '@/app/lib/gallery';
import { isValidShareToken } from '@/app/lib/share-token';
import { isShareUnlockedFromStore } from '@/app/lib/share-access';
import { ShareGallery } from '@/app/ui/front/share/share-gallery';
import { SharePasswordGate } from '@/app/ui/front/share/share-password-gate';
import { cn } from '@/lib/utils';

// 分享页每次都反映最新的过期/吊销状态，不做静态化
export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  if (!isValidShareToken(token)) return { robots: { index: false, follow: false } };
  const share = await getUsableShareByToken(token);
  if (!share) return { robots: { index: false, follow: false } };
  return {
    title: share.name || 'Shared Album',
    robots: { index: false, follow: false },
  };
}

export default async function SharePage({ params }: PageProps) {
  const { token } = await params;
  const t = await getTranslations('front.share.page');

  if (!isValidShareToken(token)) notFound();

  const share = await getUsableShareByToken(token);
  if (!share) {
    return (
      <div className="front-fade-up mx-auto flex max-w-lg flex-col items-center gap-4 py-24 text-center">
        <h1 className="font-serif text-3xl font-semibold text-zinc-800 dark:text-white/90">
          {t('unavailableTitle')}
        </h1>
        <p className="text-sm text-zinc-600/80 dark:text-white/60">
          {t('unavailableDescription')}
        </p>
      </div>
    );
  }

  const unlocked = await isShareUnlockedFromStore(token);
  if (share.passwordHash && !unlocked) {
    return (
      <div className="py-16">
        <SharePasswordGate token={token} />
      </div>
    );
  }

  const records = await fetchSharedMedia(share);
  const items = buildGalleryItems(records, token);

  // 计数不阻塞渲染
  void incrementShareViewCount(share.id).catch(() => {});

  return (
    <div className="space-y-10">
      <header className="front-fade-up space-y-4">
        <p className="text-xs uppercase tracking-[0.4em] text-zinc-600/80 dark:text-white/60">
          {t('eyebrow')}
        </p>
        <h1
          className={cn(
            'font-serif',
            'text-4xl font-semibold text-zinc-800/90 dark:text-white/85 md:text-5xl',
          )}
        >
          {share.name || t('title')}
        </h1>
        <p className="text-sm text-zinc-600/80 dark:text-white/60">
          {t('description')} · {t('count', { count: items.length })}
        </p>
      </header>

      <div className="relative z-10">
        <ShareGallery
          items={items}
          allowDownload={share.role === 'editor' || share.allowDownload}
          shareToken={token}
        />
      </div>
    </div>
  );
}
