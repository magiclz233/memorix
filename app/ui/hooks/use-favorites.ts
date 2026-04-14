'use client';

import { useCallback, useMemo, useState } from 'react';

const FAVORITES_KEY = 'lumina:favorites:v1';

const readFavorites = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.map((item) => String(item)).filter(Boolean)));
  } catch {
    return [];
  }
};

const writeFavorites = (ids: string[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
};

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => readFavorites());

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const isFavorite = useCallback(
    (id: string | number) => favoriteSet.has(String(id)),
    [favoriteSet],
  );

  const toggleFavorite = useCallback((id: string | number) => {
    const nextId = String(id);
    let nextState = false;

    setFavoriteIds((prev) => {
      const exists = prev.includes(nextId);
      const next = exists ? prev.filter((item) => item !== nextId) : [...prev, nextId];
      writeFavorites(next);
      nextState = !exists;
      return next;
    });

    return nextState;
  }, []);

  return {
    favoriteIds,
    isFavorite,
    toggleFavorite,
  };
}
