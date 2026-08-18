'use client';

import { useCallback, useEffect, useState } from 'react';
import { detectIOSSafari, isStandalonePWA } from '@/hooks/useIsIOS';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

/**
 * Captures the browser install prompt without showing it on load,
 * so it never clashes with the waitlist modal.
 */
export function usePWAInstall() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setIos(detectIOSSafari());
    if (isStandalonePWA()) {
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
    if (isStandalonePWA()) return 'accepted';
    if (detectIOSSafari()) return 'ios';
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
