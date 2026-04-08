import { useEffect, useState } from 'react';

type NetworkStatusOptions = {
  onOffline?: () => void;
  onOnline?: () => void;
};

export function useNetworkStatus(options?: NetworkStatusOptions) {
  const [online, setOnline] = useState(() => {
    if (typeof navigator === 'undefined') {
      return true;
    }

    return navigator.onLine;
  });

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      options?.onOnline?.();
    };

    const handleOffline = () => {
      setOnline(false);
      options?.onOffline?.();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [options]);

  return {
    online,
    offline: !online,
  };
}