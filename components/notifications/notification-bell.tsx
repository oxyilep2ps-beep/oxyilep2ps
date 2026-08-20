'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Check, Loader2, MessageCircle, UserPlus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  getUnreadNotificationCount,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  respondToFriendRequestNotification,
  type AppNotification,
} from '@/app/actions/notifications';
import { IncomingRequestsPanel, useIncomingRequestCount } from '@/components/social/incoming-requests-panel';
import { cn } from '@/lib/utils';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function destinationFor(item: AppNotification): string | null {
  if (item.type === 'like') return '/feed';
  if (item.actor_username) return `/profile/${item.actor_username}`;
  if (item.actor_id) return `/chats/${item.actor_id}`;
  return null;
}

function NotificationRow({
  item,
  onChanged,
  onClose,
  onOptimisticRead,
}: {
  item: AppNotification;
  onChanged: () => void;
  onClose: () => void;
  onOptimisticRead?: (id: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const name = item.actor_name || 'Someone';
  const href = destinationFor(item);

  const onRespond = (action: 'accept' | 'reject') => {
    startTransition(async () => {
      onOptimisticRead?.(item.id);
      await respondToFriendRequestNotification({
        notificationId: item.id,
        action,
        connectionId: item.link_id,
        actorId: item.actor_id,
      });
      onChanged();
      window.dispatchEvent(new Event('oxyile:connections-changed'));
    });
  };

  const onOpen = () => {
    startTransition(async () => {
      if (!item.is_read) {
        onOptimisticRead?.(item.id);
        await markNotificationRead(item.id);
      }
      onChanged();
      if (href) {
        onClose();
        router.push(href);
      }
    });
  };

  return (
    <li
      className={cn(
        'border-b border-gray-200 px-3 py-3 last:border-b-0 dark:border-gray-800',
        !item.is_read && 'bg-[#F97316]/5'
      )}
    >
      <div className="flex gap-3">
        <button type="button" onClick={onOpen} className="shrink-0">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#F97316]/15 text-xs font-bold text-[#F97316]">
            {item.actor_avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.actor_avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(name)
            )}
          </div>
        </button>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={onOpen} className="w-full text-left">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-gray-600 dark:text-gray-400">{item.message}</p>
            <p className="mt-1 text-[10px] font-medium text-gray-500">{timeAgo(item.created_at)}</p>
          </button>

          {item.type === 'friend_request' ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => onRespond('accept')}
                className="inline-flex items-center gap-1 rounded-full bg-[#F97316] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#ea580c] disabled:opacity-60"
              >
                {pending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Accept
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => onRespond('reject')}
                className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1.5 text-[11px] font-bold text-gray-600 transition hover:border-red-500/40 hover:text-red-500 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300"
              >
                <X size={12} />
                Reject
              </button>
              {href ? (
                <Link
                  href={href}
                  onClick={onClose}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F97316] hover:underline"
                >
                  <UserPlus size={11} />
                  View profile
                </Link>
              ) : null}
            </div>
          ) : null}

          {item.type === 'friend_accepted' && item.actor_id ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {href ? (
                <Link
                  href={href}
                  onClick={onClose}
                  className="inline-flex items-center gap-1 rounded-full border border-[#F97316]/40 bg-[#F97316]/10 px-3 py-1.5 text-[11px] font-bold text-[#F97316]"
                >
                  View profile
                </Link>
              ) : null}
              <Link
                href={`/chats/${item.actor_id}`}
                onClick={onClose}
                className="inline-flex items-center gap-1 rounded-full bg-[#F97316] px-3 py-1.5 text-[11px] font-bold text-white"
              >
                <MessageCircle size={11} />
                Message
              </Link>
            </div>
          ) : null}
        </div>
        {!item.is_read ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#F97316]" /> : null}
      </div>
    </li>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'requests' | 'all'>('requests');
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [marking, startMarkAll] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const { count: incomingCount, refresh: refreshIncoming } = useIncomingRequestCount();

  const refresh = useCallback(async () => {
    const [rows, count] = await Promise.all([listMyNotifications(40), getUnreadNotificationCount()]);
    setItems(rows);
    setUnread(count);
    await refreshIncoming();
  }, [refreshIncoming]);

  const markLocalRead = useCallback((id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnread((c) => Math.max(0, c - 1));
  }, []);

  const markAllLocalRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => void refresh(), 250);
    };

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`notifications-live-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const event = payload.eventType;
            if (event === 'INSERT') {
              const row = payload.new as {
                id: string;
                user_id: string;
                actor_id: string | null;
                type: string;
                title: string;
                message: string;
                is_read: boolean;
                link_id: string | null;
                created_at: string;
              };
              setItems((prev) => {
                if (prev.some((n) => n.id === row.id)) return prev;
                const next: AppNotification = {
                  id: row.id,
                  user_id: row.user_id,
                  actor_id: row.actor_id,
                  type: row.type,
                  title: row.title,
                  message: row.message,
                  is_read: row.is_read,
                  link_id: row.link_id,
                  created_at: row.created_at,
                  actor_name: null,
                  actor_username: null,
                  actor_avatar: null,
                };
                return [next, ...prev].slice(0, 40);
              });
              if (!row.is_read) setUnread((c) => c + 1);
              scheduleRefresh();
              return;
            }

            if (event === 'UPDATE') {
              const next = payload.new as { id: string; is_read?: boolean };
              const prev = payload.old as { id?: string; is_read?: boolean } | undefined;
              const wasUnread = prev?.is_read === false;
              const nowRead = next.is_read === true;
              setItems((curr) =>
                curr.map((n) => (n.id === next.id ? { ...n, is_read: Boolean(next.is_read) } : n))
              );
              if (wasUnread && nowRead) {
                setUnread((c) => Math.max(0, c - 1));
              } else if (prev?.is_read === true && next.is_read === false) {
                setUnread((c) => c + 1);
              } else if (prev?.is_read === undefined) {
                // Replica identity may omit old row — reconcile from server shortly.
                scheduleRefresh();
              }
              return;
            }

            if (event === 'DELETE') {
              const old = payload.old as { id?: string; is_read?: boolean };
              if (old.id) {
                setItems((curr) => curr.filter((n) => n.id !== old.id));
                if (old.is_read === false) setUnread((c) => Math.max(0, c - 1));
              }
              scheduleRefresh();
            }
          }
        )
        .subscribe();
    })();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void refresh().finally(() => setLoading(false));
    if (incomingCount > 0) setTab('requests');
  }, [open, refresh, incomingCount]);

  useEffect(() => {
    const onAway = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onAway);
    return () => window.removeEventListener('mousedown', onAway);
  }, []);

  const badgeTotal = unread + incomingCount;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition sm:h-10 sm:w-10',
          badgeTotal > 0
            ? 'border-[#F97316]/40 bg-[#F97316]/10 text-[#F97316]'
            : 'border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400'
        )}
        aria-label={badgeTotal > 0 ? `${badgeTotal} notifications` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell size={16} />
        {badgeTotal > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-h-[16px] min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {badgeTotal > 99 ? '99+' : badgeTotal}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(92vw,24rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-gray-800 dark:bg-[#111]/95">
          <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-3 dark:border-gray-800">
            <p className="text-sm font-black text-gray-900 dark:text-white">Notifications</p>
            <button
              type="button"
              disabled={marking || unread === 0}
              onClick={() =>
                startMarkAll(async () => {
                  markAllLocalRead();
                  await markAllNotificationsRead();
                  await refresh();
                })
              }
              className="text-[11px] font-bold text-[#F97316] disabled:opacity-40"
            >
              {marking ? '…' : 'Mark all as read'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1 border-b border-gray-200 p-1.5 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setTab('requests')}
              className={cn(
                'relative rounded-xl px-2 py-2 text-xs font-bold transition',
                tab === 'requests'
                  ? 'bg-[#F97316]/15 text-[#F97316]'
                  : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
              )}
            >
              Incoming Requests
              {incomingCount > 0 ? (
                <span className="ml-1 inline-flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#F97316] px-1 text-[10px] font-bold text-white">
                  {incomingCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setTab('all')}
              className={cn(
                'rounded-xl px-2 py-2 text-xs font-bold transition',
                tab === 'all'
                  ? 'bg-[#F97316]/15 text-[#F97316]'
                  : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
              )}
            >
              All
              {unread > 0 ? (
                <span className="ml-1 inline-flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unread}
                </span>
              ) : null}
            </button>
          </div>

          <div className="max-h-[min(70vh,24rem)] overflow-y-auto">
            {tab === 'requests' ? (
              <IncomingRequestsPanel
                onChanged={() => {
                  void refresh();
                }}
              />
            ) : loading && items.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={18} className="animate-spin text-[#F97316]" />
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell size={22} className="mx-auto mb-2 text-gray-400 dark:text-gray-600" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No notifications yet</p>
                <p className="mt-1 text-xs text-gray-500">Friend requests and updates will show up here.</p>
              </div>
            ) : (
              <ul>
                {items.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    onChanged={() => void refresh()}
                    onClose={() => setOpen(false)}
                    onOptimisticRead={markLocalRead}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
