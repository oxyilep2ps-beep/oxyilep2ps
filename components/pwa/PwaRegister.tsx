'use client';

import { useEffect } from 'react';

/** Registers the PWA service worker so Chrome/Edge can offer installation. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (window.location.hostname === 'localhost') return;

    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
  }, []);

  return null;
}
