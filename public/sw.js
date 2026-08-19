/* Oxyile PWA Service Worker
   Pass-through fetch keeps Chrome installability without breaking Next.js App Router caching. */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

// ── Push Notifications ─────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let data = {
    title: 'Oxyile',
    body: 'You have a new update.',
    url: '/chats',
    tag: 'oxyile',
    icon: '/icons/icon-192.png',
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = {
        title: parsed.title || data.title,
        body: parsed.body || data.body,
        url: parsed.url || data.url,
        tag: parsed.tag || data.tag,
        icon: parsed.icon || data.icon,
      };
    }
  } catch {
    const text = event.data ? event.data.text() : '';
    if (text) data.body = text;
  }

  const options = {
    body: data.body,
    icon: data.icon,
    // Badge icon displayed in Android notification bar (monochrome PNG recommended).
    badge: '/icons/icon-192.png',
    tag: data.tag,
    // Android vibration pattern (ms): vibrate → pause → vibrate
    vibrate: [200, 100, 200],
    // NOTE: The `sound` property is part of the Web Notifications spec but has
    // very limited browser support.  Chrome on Android and Firefox honour it; iOS
    // Safari always uses the system default notification sound and ignores this
    // property entirely — this is an OS-level restriction that cannot be overridden.
    sound: '/sounds/notification.mp3',
    // Clicking the notification opens the relevant URL (handled in notificationclick).
    data: { url: data.url },
    // Keeps the notification visible until the user interacts (Android).
    requireInteraction: false,
    // Show notification actions on supporting platforms.
    actions: [
      { action: 'open', title: 'Open Inbox' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── Notification Click ────────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Honour action buttons
  if (event.action === 'dismiss') return;

  const targetUrl =
    (event.notification.data && event.notification.data.url) || '/chats';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus an existing tab on the target URL if one is open
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          if (clientUrl.pathname.startsWith(targetUrl.split('?')[0]) && 'focus' in client) {
            client.focus();
            return;
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
