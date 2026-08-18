'use client';

import { useEffect, useRef } from 'react';
import { savePushSubscription } from '@/app/actions/sendPushNotification';
import { createClient } from '@/lib/supabase/client';
import { urlBase64ToUint8Array } from '@/lib/push/url-base64';

function pushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

async function subscribeAndSave(registration: ServiceWorkerRegistration, vapidPublicKey: string) {
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    }));

  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) return;
  await savePushSubscription({ endpoint, p256dh, auth });
}

/**
 * Requests notification permission (when still default), subscribes via the Push API
 * using the VAPID public key, and persists the subscription in Supabase.
 */
export function usePushNotifications() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!pushSupported()) return;

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
    if (!vapidPublicKey) return;

    void (async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) return;

        if (Notification.permission === 'denied') return;

        if (Notification.permission === 'default') {
          const result = await Notification.requestPermission();
          if (result !== 'granted') return;
        }

        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await subscribeAndSave(registration, vapidPublicKey);
      } catch (error) {
        console.error('[usePushNotifications]', error);
      }
    })();
  }, []);
}
