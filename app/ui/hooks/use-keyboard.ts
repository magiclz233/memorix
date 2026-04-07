import { useEffect } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;

export function useKeyboard(
  key: string,
  handler: KeyHandler,
  options?: { ctrlOrMeta?: boolean; enabled?: boolean },
) {
  const { ctrlOrMeta = false, enabled = true } = options ?? {};

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      const matchedKey = event.key.toLowerCase() === key.toLowerCase();
      const matchedModifier = ctrlOrMeta ? event.ctrlKey || event.metaKey : true;

      if (matchedKey && matchedModifier) {
        handler(event);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, key, ctrlOrMeta, handler]);
}
