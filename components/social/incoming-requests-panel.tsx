'use client';

import { useEffect, useState, useSyncExternalStore, useTransition } from 'react';
import Link from 'next/link';
import { Check, Loader2, UserPlus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { acceptFriendRequest, removeConnection } from '@/app/actions/connections';
import {
  bindNotificationsGlobalListeners,
  getNotificationsSnapshot,
  hydrateNotifications,
  resolveFriendRequestLocally,
  subscribeNotifications,
} from '@/lib/social/notifications-store';
import { cn } from '@/lib/utils';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function useIncomingRequestCount() {
  const snap = useSyncExternalStore(subscribeNotifications, getNotificationsSnapshot, getNotificationsSnapshot);

  useEffect(() => {
    void hydrateNotifications();
    return bindNotificationsGlobalListeners();
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase
        .channel(`incoming-requests-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_connections' },
          () => {
            void hydrateNotifications({ force: true });
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  return {
    count: snap.incomingCount,
    refresh: () => hydrateNotifications({ force: true }),
  };
}

export function IncomingRequestsPanel({
  onChanged,
  compact = false,
}: {
  onChanged?: () => void;
  compact?: boolean;
}) {
  const snap = useSyncExternalStore(subscribeNotifications, getNotificationsSnapshot, getNotificationsSnapshot);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    void hydrateNotifications();
  }, []);

  const respond = (connectionId: string, action: 'accept' | 'decline') => {
    const mapped = action === 'accept' ? 'accept' : 'reject';
    resolveFriendRequestLocally(connectionId, mapped);
    setBusyId(connectionId);
    startTransition(async () => {
      const result =
        action === 'accept'
          ? await acceptFriendRequest(connectionId)
          : await removeConnection(connectionId);
      setBusyId(null);
      if (result.ok) {
        onChanged?.();
        window.dispatchEvent(new Event('oxyile:connections-changed'));
      }
      void hydrateNotifications({ force: true });
    });
  };

  const rows = snap.pendingRequests;
  const loading = snap.loading && rows.length === 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={18} className="animate-spin text-[#F97316]" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className={cn('px-3 py-8 text-center', compact && 'py-6')}>
        <UserPlus size={20} className="mx-auto mb-2 text-gray-400 dark:text-gray-600" />
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No incoming requests</p>
        <p className="mt-1 text-xs text-gray-500">When someone connects with you, they&apos;ll show up here.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-200 dark:divide-gray-800">
      {rows.map((row) => {
        const name = row.requester.full_legal_name || 'Someone';
        const busy = busyId === row.connectionId;
        const profileHref = row.requester.username
          ? `/profile/${row.requester.username}`
          : '/search';

        return (
          <li key={row.connectionId} className="flex items-center gap-3 px-3 py-3">
            <Link href={profileHref} className="shrink-0">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#F97316]/15 text-xs font-bold text-[#F97316]">
                {row.requester.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.requester.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(name)
                )}
              </div>
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={profileHref} className="block truncate text-sm font-bold text-gray-900 dark:text-white">
                {name}
              </Link>
              <p className="truncate text-xs font-semibold text-[#F97316]">
                @{row.requester.username || 'oxyile'}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => respond(row.connectionId, 'accept')}
                  className="inline-flex items-center gap-1 rounded-full bg-[#F97316] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#ea580c] disabled:opacity-60"
                >
                  {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Accept
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => respond(row.connectionId, 'decline')}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1.5 text-[11px] font-bold text-gray-600 transition hover:border-red-500/40 hover:text-red-500 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300"
                >
                  <X size={12} />
                  Decline
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
