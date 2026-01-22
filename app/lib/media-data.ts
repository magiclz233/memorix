export type MediaSource = 'Synology NAS' | 'AWS S3' | 'Qiniu Cloud';
export type MediaKind = 'image' | 'video';

export type MediaItem = {
  id: string;
  title: string;
  source: MediaSource;
  kind: MediaKind;
  createdAt: string;
  width: number;
  height: number;
  thumb: string;
};

export const MEDIA_SOURCES: MediaSource[] = ['Synology NAS', 'AWS S3', 'Qiniu Cloud'];
export const MEDIA_KINDS: MediaKind[] = ['image', 'video'];

const ASPECTS = [
  { width: 4, height: 3 },
  { width: 3, height: 4 },
  { width: 16, height: 9 },
  { width: 1, height: 1 },
];

const createMediaItems = (): MediaItem[] =>
  Array.from({ length: 48 }, (_, index) => {
    const aspect = ASPECTS[index % ASPECTS.length];
    const kind = index % 5 === 0 ? 'video' : 'image';
    const source = MEDIA_SOURCES[index % MEDIA_SOURCES.length];
    const createdAt = new Date(
      Date.UTC(2024, index % 12, (index % 28) + 1),
    ).toISOString();
    return {
      id: `media-${index + 1}`,
      title: `Media Item ${index + 1}`,
      source,
      kind,
      createdAt,
      width: aspect.width,
      height: aspect.height,
      thumb: index % 2 === 0 ? '/hero-desktop.png' : '/hero-mobile.png',
    };
  });

const MEDIA_ITEMS = createMediaItems();

type MediaPageOptions = {
  page: number;
  perPage: number;
  source?: MediaSource | 'all';
  kind?: MediaKind | 'all';
};

export const fetchMediaPage = ({ page, perPage, source, kind }: MediaPageOptions) => {
  const filtered = MEDIA_ITEMS.filter((item) => {
    const sourceMatch = !source || source === 'all' ? true : item.source === source;
    const kindMatch = !kind || kind === 'all' ? true : item.kind === kind;
    return sourceMatch && kindMatch;
  });
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * perPage;
  const items = filtered.slice(start, start + perPage);
  return { items, totalPages, totalCount, page: safePage };
};
