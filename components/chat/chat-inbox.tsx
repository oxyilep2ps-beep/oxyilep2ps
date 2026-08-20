'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { Check, CheckCheck, Loader2, MessageCircle, Search, UserCheck, UserPlus, Users, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import {
  acceptConnectionRequest,
  listDiscoverUsers,
  listMyConnections,
  listPendingRequests,
  removeConnection,
  sendConnectionRequest,
} from '@/app/actions/connections';
import type { DiscoverUser } from '@/app/actions/connections';
import type { UserPresence } from '@/lib/chat/types';
import { ChatAvatar } from '@/components/chat/chat-avatar';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type ConnectedPeer = {
  userId: string;
  connectionId: string;
  full_legal_name: string;
  username: string | null;
  avatar_url: string | null;
  role: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unread?: number;
};

type PendingRequest = {
  connectionId: string;
  requester: {
    id: string;
    full_legal_name: string;
    avatar_url: string | null;
    role: string;
  };
};

type Tab = 'messages' | 'discover';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTs(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─── Connection Action Button ────────────────────────────────────────────────

function ConnectButton({
  user,
  onRefresh,
}: {
  user: DiscoverUser;
  onRefresh: () => void;
}) {
  const [pending, startTransition] = useTransition();

  const handleSend = () => {
    startTransition(async () => {
      await sendConnectionRequest(user.id);
      onRefresh();
    });
  };

  const handleAccept = (connectionId: string) => {
    startTransition(async () => {
      await acceptConnectionRequest(connectionId);
      onRefresh();
    });
  };

  const handleRemove = (connectionId: string) => {
    startTransition(async () => {
      await removeConnection(connectionId);
      onRefresh();
    });
  };

  if (user.connection_status === 'accepted') {
    return (
      <Link
        href={`/chats/${user.id}`}
        className="inline-flex items-center gap-1.5 rounded-full bg-[#F97316]/10 px-3 py-1.5 text-xs font-bold text-[#F97316] transition hover:bg-[#F97316]/20"
      >
        <MessageCircle size={13} />
        Message
      </Link>
    );
  }

  if (user.connection_status === 'pending_sent') {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => user.connection_id && handleRemove(user.connection_id)}
        className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:border-red-400 hover:text-red-500 dark:border-gray-700 dark:text-gray-400"
      >
        {pending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
        Sent
      </button>
    );
  }

  if (user.connection_status === 'pending_received') {
    return (
      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => user.connection_id && handleAccept(user.connection_id)}
          className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
        >
          {pending ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />}
          Accept
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => user.connection_id && handleRemove(user.connection_id)}
          className="inline-flex items-center gap-1 rounded-full border border-red-400/50 px-2.5 py-1.5 text-xs font-bold text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleSend}
      className="inline-flex items-center gap-1.5 rounded-full border border-[#F97316]/50 bg-[#F97316]/10 px-3 py-1.5 text-xs font-bold text-[#F97316] transition hover:bg-[#F97316]/20 disabled:opacity-50"
    >
      {pending ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
      Connect
    </button>
  );
}

// ─── Pending Requests Banner ─────────────────────────────────────────────────

function PendingRequestsBanner({
  requests,
  onRefresh,
}: {
  requests: PendingRequest[];
  onRefresh: () => void;
}) {
  const [pending, startTransition] = useTransition();

  if (requests.length === 0) return null;

  return (
    <div className="mx-4 mb-3 overflow-hidden rounded-2xl border border-[#F97316]/30 bg-[#F97316]/5">
      <div className="flex items-center gap-2 border-b border-[#F97316]/20 px-4 py-2.5">
        <Users size={14} className="text-[#F97316]" />
        <span className="text-xs font-bold text-[#F97316]">
          {requests.length} Connection Request{requests.length > 1 ? 's' : ''}
        </span>
      </div>
      <ul className="divide-y divide-[#F97316]/10">
        {requests.map((req) => (
          <li key={req.connectionId} className="flex items-center gap-3 px-4 py-3">
            <ChatAvatar
              name={req.requester.full_legal_name}
              avatarUrl={req.requester.avatar_url}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                {req.requester.full_legal_name}
              </p>
              <p className="text-[10px] text-gray-500">Wants to connect</p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await acceptConnectionRequest(req.connectionId);
                    onRefresh();
                  })
                }
                className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {pending ? <Loader2 size={12} className="animate-spin" /> : 'Accept'}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await removeConnection(req.connectionId);
                    onRefresh();
                  })
                }
                className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 hover:border-red-400 hover:text-red-500 dark:border-gray-700"
              >
                Decline
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Main Inbox ───────────────────────────────────────────────────────────────

export function ChatInbox() {
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<Tab>('messages');
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [loadingDiscover, setLoadingDiscover] = useState(false);
  const [peers, setPeers] = useState<ConnectedPeer[]>([]);
  const [discoverUsers, setDiscoverUsers] = useState<DiscoverUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [presenceMap, setPresenceMap] = useState<Record<string, UserPresence>>({});
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // ── Load messages tab data ──
  useEffect(() => {
    let cancelled = false;
    setLoadingMessages(true);
    setError(null);

    void (async () => {
      try {
        const [connections, requests] = await Promise.all([
          listMyConnections(),
          listPendingRequests(),
        ]);
        if (cancelled) return;

        const {
          data: { user },
        } = await supabase.auth.getUser();
        const myId = user?.id;

        let peersWithPreview: ConnectedPeer[] = connections.map((c) => ({ ...c }));
        if (myId && connections.length > 0) {
          const peerIds = connections.map((c) => c.userId);
          const { data: recent } = await supabase
            .from('messages')
            .select('id, sender_id, receiver_id, content, created_at, is_read')
            .or(
              `and(sender_id.eq.${myId},receiver_id.in.(${peerIds.join(',')})),and(receiver_id.eq.${myId},sender_id.in.(${peerIds.join(',')}))`
            )
            .order('created_at', { ascending: false })
            .limit(200);

          const lastByPeer = new Map<string, { content: string; created_at: string }>();
          const unreadByPeer = new Map<string, number>();
          for (const row of recent ?? []) {
            const peerId =
              row.sender_id === myId ? String(row.receiver_id) : String(row.sender_id);
            if (!lastByPeer.has(peerId)) {
              lastByPeer.set(peerId, {
                content: String(row.content ?? ''),
                created_at: String(row.created_at),
              });
            }
            if (row.receiver_id === myId && row.is_read === false) {
              unreadByPeer.set(peerId, (unreadByPeer.get(peerId) ?? 0) + 1);
            }
          }

          peersWithPreview = connections.map((c) => {
            const last = lastByPeer.get(c.userId);
            return {
              ...c,
              lastMessage: last?.content,
              lastMessageAt: last?.created_at,
              unread: unreadByPeer.get(c.userId) ?? 0,
            };
          });
        }

        setPeers(peersWithPreview);
        setPendingRequests(requests);

        // Presence
        if (connections.length > 0) {
          const ids = connections.map((c) => c.userId);
          const { data: presenceRows } = await supabase
            .from('user_presence')
            .select('user_id, status, last_seen')
            .in('user_id', ids);
          if (!cancelled) {
            const map: Record<string, UserPresence> = {};
            for (const row of presenceRows ?? []) map[row.user_id as string] = row as UserPresence;
            setPresenceMap(map);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load inbox');
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    })();

    return () => { cancelled = true; };
  }, [supabase, refreshKey]);

  // ── Load discover tab data (lazy) ──
  useEffect(() => {
    if (tab !== 'discover') return;
    let cancelled = false;
    setLoadingDiscover(true);

    void (async () => {
      try {
        const users = await listDiscoverUsers(60);
        if (!cancelled) setDiscoverUsers(users);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoadingDiscover(false);
      }
    })();

    return () => { cancelled = true; };
  }, [tab, refreshKey]);

  // ── Realtime presence + message previews ──
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const myId = user?.id ?? '';
      if (cancelled || !myId) return;

      channel = supabase
        .channel(`inbox-live-${myId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, (payload) => {
          const row = payload.new as UserPresence;
          if (row?.user_id) {
            setPresenceMap((m) => ({ ...m, [row.user_id]: row }));
          }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const msg = payload.new as {
            sender_id: string;
            receiver_id: string;
            content: string;
            created_at: string;
            is_read?: boolean;
          };
          const peerId =
            msg.sender_id === myId ? msg.receiver_id : msg.receiver_id === myId ? msg.sender_id : null;
          if (!peerId) return;
          setPeers((prev) =>
            prev.map((p) => {
              if (p.userId !== peerId) return p;
              const incoming = msg.receiver_id === myId;
              return {
                ...p,
                lastMessage: msg.content,
                lastMessageAt: msg.created_at,
                unread: incoming ? (p.unread ?? 0) + 1 : p.unread,
              };
            })
          );
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
          const msg = payload.new as {
            sender_id: string;
            receiver_id: string;
            is_read?: boolean;
          };
          if (msg.receiver_id !== myId || msg.is_read !== true) return;
          setPeers((prev) =>
            prev.map((p) => (p.userId === msg.sender_id ? { ...p, unread: 0 } : p))
          );
        })
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [supabase]);

  // ── Filtered lists ──
  const filteredPeers = useMemo(() => {
    if (!search.trim()) return peers;
    const q = search.trim().toLowerCase();
    return peers.filter(
      (p) =>
        p.full_legal_name.toLowerCase().includes(q) ||
        (p.username ?? '').toLowerCase().includes(q)
    );
  }, [peers, search]);

  const filteredDiscover = useMemo(() => {
    if (!search.trim()) return discoverUsers;
    const q = search.trim().toLowerCase();
    return discoverUsers.filter(
      (u) =>
        u.full_legal_name.toLowerCase().includes(q) ||
        (u.username ?? '').toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [discoverUsers, search]);

  return (
    <div className="oxyile-fill-chrome flex flex-col overflow-hidden bg-transparent">
      {/* ── Header ── */}
      <div className="shrink-0 border-b border-gray-200 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-gray-800 dark:bg-black/80">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">Inbox</h1>
            <p className="text-xs text-gray-500">
              {peers.length > 0 ? `${peers.length} connection${peers.length > 1 ? 's' : ''}` : 'No connections yet'}
            </p>
          </div>
          {pendingRequests.length > 0 && (
            <span className="rounded-full bg-[#F97316] px-2.5 py-0.5 text-xs font-black text-white">
              {pendingRequests.length} pending
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === 'messages' ? 'Search conversations…' : 'Search people…'}
            className="h-9 w-full rounded-xl border border-gray-200 bg-gray-100 pl-8 pr-3 text-sm text-gray-900 outline-none placeholder:text-gray-500 focus:border-[#F97316]/50 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-400"
          />
        </div>

        {/* Tabs */}
        <div className="mt-3 flex gap-1">
          {([
            { id: 'messages', label: 'Messages', icon: MessageCircle },
            { id: 'discover', label: 'Discover', icon: Users },
          ] as const).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition',
                tab === t.id
                  ? 'bg-[#F97316]/15 text-[#F97316]'
                  : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
              )}
            >
              <t.icon size={13} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {tab === 'messages' ? (
            <motion.div
              key="messages"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              {/* Pending requests banner */}
              <div className="pt-3">
                <PendingRequestsBanner requests={pendingRequests} onRefresh={refresh} />
              </div>

              {loadingMessages ? (
                <div className="flex flex-col gap-3 px-4 pt-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                        <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-gray-900" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="mx-4 mt-4 rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-950/30">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
                  <button
                    type="button"
                    onClick={refresh}
                    className="mt-3 rounded-full bg-[#F97316] px-4 py-1.5 text-xs font-bold text-white"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredPeers.length === 0 ? (
                <div className="flex flex-col items-center px-8 py-16 text-center">
                  <div className="mb-4 rounded-full bg-[#F97316]/10 p-5">
                    <MessageCircle size={32} className="text-[#F97316]" />
                  </div>
                  <p className="font-black text-gray-900 dark:text-white">
                    {search ? 'No conversations found' : 'No messages yet'}
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    {search
                      ? 'Try a different search term'
                      : 'Go to Discover to connect with people and start a conversation.'}
                  </p>
                  {!search && (
                    <button
                      type="button"
                      onClick={() => setTab('discover')}
                      className="mt-4 rounded-full bg-[#F97316] px-5 py-2 text-sm font-bold text-white"
                    >
                      Discover People
                    </button>
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {filteredPeers.map((peer, i) => {
                    const isOnline = presenceMap[peer.userId]?.status === 'online';
                    const lastSeen = presenceMap[peer.userId]?.last_seen;
                    return (
                      <motion.li
                        key={peer.userId}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <Link
                          href={`/chats/${peer.userId}`}
                          className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                        >
                          {/* Avatar + online dot */}
                          <div className="relative shrink-0">
                            <ChatAvatar
                              name={peer.full_legal_name}
                              avatarUrl={peer.avatar_url}
                              size="md"
                            />
                            {isOnline && (
                              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-black" />
                            )}
                          </div>

                          {/* Text */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                                {peer.full_legal_name}
                              </p>
                              {peer.lastMessageAt && (
                                <span className="shrink-0 text-[10px] text-gray-400">
                                  {formatTs(peer.lastMessageAt)}
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center justify-between gap-2">
                              <p className="truncate text-xs text-gray-500">
                                {peer.lastMessage ? (
                                  <>
                                    <CheckCheck size={11} className="mr-1 inline text-[#F97316]" />
                                    {peer.lastMessage}
                                  </>
                                ) : isOnline ? (
                                  <span className="text-emerald-500">Online</span>
                                ) : lastSeen ? (
                                  `Last seen ${formatTs(lastSeen)}`
                                ) : (
                                  'Tap to open chat'
                                )}
                              </p>
                              {(peer.unread ?? 0) > 0 && (
                                <span className="shrink-0 rounded-full bg-[#F97316] px-1.5 py-0.5 text-[10px] font-black text-white">
                                  {peer.unread}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      </motion.li>
                    );
                  })}
                </ul>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="discover"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
            >
              {loadingDiscover ? (
                <div className="flex flex-col gap-3 px-4 pt-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-2/5 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                        <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100 dark:bg-gray-900" />
                      </div>
                      <div className="h-7 w-20 animate-pulse rounded-full bg-[#F97316]/10" />
                    </div>
                  ))}
                </div>
              ) : filteredDiscover.length === 0 ? (
                <div className="flex flex-col items-center px-8 py-16 text-center">
                  <div className="mb-4 rounded-full bg-[#F97316]/10 p-5">
                    <Users size={32} className="text-[#F97316]" />
                  </div>
                  <p className="font-black text-gray-900 dark:text-white">
                    {search ? 'No users found' : 'No users to discover'}
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    {search ? 'Try a different search term' : 'Check back later as more people join Oxyile.'}
                  </p>
                </div>
              ) : (
                <>
                  <p className="px-4 pb-2 pt-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                    {filteredDiscover.length} people on Oxyile
                  </p>
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800/60">
                    {filteredDiscover.map((user, i) => (
                      <motion.li
                        key={user.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.025 }}
                        className="flex items-center gap-3 px-4 py-3.5"
                      >
                        <ChatAvatar
                          name={user.full_legal_name}
                          avatarUrl={user.avatar_url}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                            {user.full_legal_name}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-[#F97316]">
                            @{user.username || 'oxyile'}
                          </p>
                          {user.connection_status === 'accepted' && (
                            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-emerald-500">
                              <UserCheck size={10} />
                              Connected
                            </p>
                          )}
                        </div>
                        <div className="shrink-0">
                          <ConnectButton user={user} onRefresh={refresh} />
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
