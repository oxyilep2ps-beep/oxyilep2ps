'use client';

import { useCallback, useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const media = window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return media || iosStandalone;
}

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Captures the browser install prompt without showing it on load,
 * so it never clashes with the waitlist modal.
 */
export function usePWAInstall() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setIos(isIosDevice());
    if (isStandaloneDisplay()) {
      setInstalled(true);
      return;
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable' | 'ios'> => {
    if (isStandaloneDisplay()) return 'accepted';
    if (isIosDevice()) return 'ios';
    if (!promptEvent) return 'unavailable';
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    setPromptEvent(null);
    if (outcome === 'accepted') {
      setInstalled(true);
      return 'accepted';
    }
    return 'dismissed';
  }, [promptEvent]);

  return {
    canInstallNative: Boolean(promptEvent) && !installed,
    installed,
    ios,
    install,
  };
}
