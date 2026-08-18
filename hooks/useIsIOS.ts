'use client';

import { useEffect, useState } from 'react';

function getUserAgent(): string {
  if (typeof navigator === 'undefined') return '';
  return navigator.userAgent || '';
}

export function detectIOSSafari(): boolean {
  const ua = getUserAgent();
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios|opios|gsa/i.test(ua);
  return isIOS && isSafari;
}

export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  const media = window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return media || iosStandalone;
}

export function useIsIOS() {
  const [isIOSSafari, setIsIOSSafari] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setIsIOSSafari(detectIOSSafari());
    setIsInstalled(isStandalonePWA());
  }, []);

  return {
    isIOSSafari,
    isInstalled,
    shouldShowIOSInstallHelp: isIOSSafari && !isInstalled,
  };
}
