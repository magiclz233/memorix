'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    L?: {
      map: (element: HTMLElement, options?: Record<string, unknown>) => any;
      tileLayer: (url: string, options?: Record<string, unknown>) => { addTo: (map: any) => void };
      circleMarker: (
        latlng: [number, number],
        options?: Record<string, unknown>,
      ) => { addTo: (map: any) => void };
    };
  }
}

const LEAFLET_STYLE_ID = 'leaflet-style-cdn';
const LEAFLET_SCRIPT_ID = 'leaflet-script-cdn';
const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

let leafletLoadPromise: Promise<void> | null = null;

const ensureLeafletLoaded = async () => {
  if (typeof window === 'undefined') return;
  if (window.L) return;

  if (!document.getElementById(LEAFLET_STYLE_ID)) {
    const link = document.createElement('link');
    link.id = LEAFLET_STYLE_ID;
    link.rel = 'stylesheet';
    link.href = LEAFLET_CSS_URL;
    document.head.appendChild(link);
  }

  if (!leafletLoadPromise) {
    leafletLoadPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.getElementById(LEAFLET_SCRIPT_ID) as HTMLScriptElement | null;
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Leaflet load failed')), {
          once: true,
        });
        return;
      }

      const script = document.createElement('script');
      script.id = LEAFLET_SCRIPT_ID;
      script.src = LEAFLET_JS_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Leaflet load failed'));
      document.body.appendChild(script);
    });
  }

  await leafletLoadPromise;
};

type LeafletMiniMapProps = {
  latitude: number;
  longitude: number;
  fallbackText: string;
};

export function LeafletMiniMap({ latitude, longitude, fallbackText }: LeafletMiniMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;

    const renderMap = async () => {
      try {
        await ensureLeafletLoaded();
        if (!active || !containerRef.current || !window.L) return;

        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        const map = window.L.map(containerRef.current, {
          zoomControl: false,
          attributionControl: false,
        });
        map.setView([latitude, longitude], 13);

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
        }).addTo(map);

        window.L.circleMarker([latitude, longitude], {
          radius: 7,
          color: '#ef4444',
          fillColor: '#f97316',
          fillOpacity: 0.95,
          weight: 2,
        }).addTo(map);

        mapRef.current = map;
      } catch {
        if (active) {
          setLoadFailed(true);
        }
      }
    };

    void renderMap();

    return () => {
      active = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [latitude, longitude]);

  return (
    <div className='relative h-40 w-full overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60'>
      <div ref={containerRef} className='h-full w-full' />
      {loadFailed ? (
        <div className='absolute inset-0 flex items-center justify-center bg-zinc-100/90 p-3 text-center text-xs text-zinc-500 dark:bg-zinc-900/90 dark:text-zinc-300'>
          {fallbackText}
        </div>
      ) : null}
    </div>
  );
}

