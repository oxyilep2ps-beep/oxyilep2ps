'use client';

import type { AppNotification } from '@/app/actions/notifications';
import {
  getIncomingRequestCount,
  listPendingRequests,
} from '@/app/actions/connections';
import {
  getUnreadNotificationCount,
  listMyNotifications,
} from '@/app/actions/notifications';

export type PendingRequestRow = Awaited<ReturnType<typeof listPendingRequests>>[number];

export type FriendRequestResolvedDetail = {
  connectionId: string;
  action: 'accept' | 'reject';
};

type NotificationsSnapshot = {
  items: AppNotification[];
  unread: number;
  incomingCount: number;
  pendingRequests: PendingRequestRow[];
  fetchedAt: number;
  loading: boolean;
};

const CACHE_TTL_MS = 45_000;
const EVENT_RESOLVED = 'oxyile:friend-request-resolved';
const EVENT_CONNECTIONS = 'oxyile:connections-changed';

let snapshot: NotificationsSnapshot = {
  items: [],
  unread: 0,
  incomingCount: 0,
  pendingRequests: [],
  fetchedAt: 0,
  loading: false,
};

const listeners = new Set<() => void>();
let inFlight: Promise<NotificationsSnapshot> | null = null;

function emit() {
  for (const listener of listeners) listener();
}

export function getNotificationsSnapshot() {
  return snapshot;
}

export function subscribeNotifications(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function applyResolvedLocally(connectionId: string, action: 'accept' | 'reject') {
  const stillPending = snapshot.pendingRequests.some((r) => r.connectionId === connectionId);
  const stillFriendReq = snapshot.items.some(
    (n) => n.link_id === connectionId && n.type === 'friend_request'
  );
  if (!stillPending && !stillFriendReq) return;

  const wasUnreadFriend = snapshot.items.some(
    (n) => n.link_id === connectionId && n.type === 'friend_request' && !n.is_read
  );

  snapshot = {
    ...snapshot,
    pendingRequests: snapshot.pendingRequests.filter((r) => r.connectionId !== connectionId),
    incomingCount: stillPending ? Math.max(0, snapshot.incomingCount - 1) : snapshot.incomingCount,
    items: snapshot.items.map((n) => {
      if (n.link_id !== connectionId || n.type !== 'friend_request') return n;
      if (action === 'reject') {
        return {
          ...n,
          type: 'system',
          title: 'Friend Request Declined',
          message: 'You declined this friend request.',
          is_read: true,
        };
      }
      return {
        ...n,
        type: 'friend_accepted',
        title: 'Friend Request Accepted',
        message: 'You are now connected.',
        is_read: true,
      };
    }),
    unread: wasUnreadFriend ? Math.max(0, snapshot.unread - 1) : snapshot.unread,
    fetchedAt: Date.now(),
  };
  emit();
}

export function resolveFriendRequestLocally(connectionId: string, action: 'accept' | 'reject') {
  applyResolvedLocally(connectionId, action);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(EVENT_RESOLVED, {
        detail: { connectionId, action } satisfies FriendRequestResolvedDetail,
      })
    );
  }
}

export async function hydrateNotifications(options?: { force?: boolean }) {
  const force = options?.force === true;
  const fresh = Date.now() - snapshot.fetchedAt < CACHE_TTL_MS;
  if (!force && fresh && snapshot.fetchedAt > 0) {
    return snapshot;
  }
  if (inFlight) return inFlight;

  snapshot = { ...snapshot, loading: true };
  emit();

  inFlight = (async () => {
    try {
      const [items, unread, incomingCount, pendingRequests] = await Promise.all([
        listMyNotifications(40),
        getUnreadNotificationCount(),
        getIncomingRequestCount(),
        listPendingRequests(),
      ]);
      snapshot = {
        items,
        unread,
        incomingCount,
        pendingRequests,
        fetchedAt: Date.now(),
        loading: false,
      };
      emit();
      return snapshot;
    } catch {
      snapshot = { ...snapshot, loading: false };
      emit();
      return snapshot;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export function bindNotificationsGlobalListeners() {
  if (typeof window === 'undefined') return () => {};

  // Singleton — avoid stacking duplicate window listeners across remounts.
  const g = window as Window & { __oxyileNotifBound?: boolean };
  if (g.__oxyileNotifBound) return () => {};
  g.__oxyileNotifBound = true;

  const onResolved = (event: Event) => {
    const detail = (event as CustomEvent<FriendRequestResolvedDetail>).detail;
    if (!detail?.connectionId) return;
    applyResolvedLocally(detail.connectionId, detail.action);
  };

  const onConnections = () => {
    void hydrateNotifications({ force: true });
  };

  window.addEventListener(EVENT_RESOLVED, onResolved);
  window.addEventListener(EVENT_CONNECTIONS, onConnections);
  return () => {
    window.removeEventListener(EVENT_RESOLVED, onResolved);
    window.removeEventListener(EVENT_CONNECTIONS, onConnections);
    g.__oxyileNotifBound = false;
  };
}
