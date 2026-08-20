'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { Bell, Check, Loader2, UserPlus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  getUnreadNotificationCount,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  respondToFriendRequestNotification,
  type AppNotification,
} from '@/app/actions/notifications';
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

function NotificationRow({
  item,
  onChanged,
}: {
  item: AppNotification;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const name = item.actor_name || 'Someone';

  const onRespond = (action: 'accept' | 'reject') => {
    startTransition(async () => {
      await respondToFriendRequestNotification({
        notificationId: item.id,
        action,
        connectionId: item.link_id,
        actorId: item.actor_id,
      });
      onChanged();
    });
  };

  const onOpen = () => {
    if (!item.is_read) {
      startTransition(async () => {
        await markNotificationRead(item.id);
        onChanged();
      });
    }
  };

  return (
    <li
      className={cn(
        'border-b border-gray-800 px-3 py-3 last:border-b-0',
        !item.is_read && 'bg-[#F97316]/5'
      )}
    >
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F97316]/15 text-xs font-bold text-[#F97316]">
          {item.actor_avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.actor_avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(name)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={onOpen} className="w-full text-left">
            <p className="text-sm font-semibold text-white">{item.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-gray-400">{item.message}</p>
            <p className="mt-1 text-[10px] font-medium text-gray-500">{timeAgo(item.created_at)}</p>
          </button>

          {item.type === 'friend_request' && !item.is_read ? (
            <div className="mt-2.5 flex items-center gap-2">
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
                className="inline-flex items-center gap-1 rounded-full border border-gray-700 px-3 py-1.5 text-[11px] font-bold text-gray-300 transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-60"
              >
                <X size={12} />
                Reject
              </button>
            </div>
          ) : null}

          {item.type === 'friend_request' && item.actor_username ? (
            <Link
              href={`/user/${item.actor_username}`}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#F97316] hover:underline"
            >
              <UserPlus size={11} />
              View profile
            </Link>
          ) : null}
        </div>
        {!item.is_read ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#F97316]" /> : null}
      </div>
    </li>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [marking, startMarkAll] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const [rows, count] = await Promise.all([listMyNotifications(40), getUnreadNotificationCount()]);
    setItems(rows);
    setUnread(count);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void refresh();
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void refresh().finally(() => setLoading(false));
  }, [open, refresh]);

  useEffect(() => {
    const onAway = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onAway);
    return () => window.removeEventListener('mousedown', onAway);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition sm:h-10 sm:w-10',
          unread > 0
            ? 'border-[#F97316]/40 bg-[#F97316]/10 text-[#F97316]'
            : 'border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400'
        )}
        aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell size={16} />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-h-[16px] min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(92vw,22rem)] overflow-hidden rounded-2xl border border-gray-800 bg-[#111]/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2 border-b border-gray-800 px-3 py-3">
            <p className="text-sm font-black text-white">Notifications</p>
            <button
              type="button"
              disabled={marking || unread === 0}
              onClick={() =>
                startMarkAll(async () => {
                  await markAllNotificationsRead();
                  await refresh();
                })
              }
              className="text-[11px] font-bold text-[#F97316] disabled:opacity-40"
            >
              {marking ? '…' : 'Mark all as read'}
            </button>
          </div>

          <div className="max-h-[min(70vh,24rem)] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={18} className="animate-spin text-[#F97316]" />
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell size={22} className="mx-auto mb-2 text-gray-600" />
                <p className="text-sm font-semibold text-gray-300">No notifications yet</p>
                <p className="mt-1 text-xs text-gray-500">Friend requests and likes will show up here.</p>
              </div>
            ) : (
              <ul>
                {items.map((item) => (
                  <NotificationRow key={item.id} item={item} onChanged={() => void refresh()} />
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
