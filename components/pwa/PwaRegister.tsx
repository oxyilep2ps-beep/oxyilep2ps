'use client';

import { useEffect } from 'react';

/** Registers a pass-through service worker in production only (required for installability). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    void navigator.serviceWorker.register('/sw.js').catch(() => {
      /* installability still works without SW in some browsers */
    });
  }, []);

  return null;
}
