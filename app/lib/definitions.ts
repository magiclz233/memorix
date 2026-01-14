// 前台展示用类型
export type MediaItem = {
  id: string;
  type: 'photo' | 'video';
  title: string;
  cover?: string;
  coverUrl?: string;
  tags?: string[];
  createdAt: string;
  collectionId?: string;
};

export type Collection = {
  id: string;
  type: 'photo' | 'video';
  title: string;
  cover: string;
  count: number;
  description: string;
  tags?: string[];
};
