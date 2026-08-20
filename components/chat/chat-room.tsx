'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { ArrowLeft, Handshake, Loader2, Lock, Send, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { markConversationRead } from '@/app/actions/chat';
import { notifyChatMessagePush } from '@/app/actions/sendPushNotification';
import { getConnectionStatus, sendConnectionRequest } from '@/app/actions/connections';
import type { ConnectionStatus } from '@/app/actions/connections';
import type { ChatMessage, ChatPeer, HandshakeRow, MemberRole, UserPresence } from '@/lib/chat/types';
import { normalizeHandshakeRow } from '@/lib/chat/handshake-realtime';
import {
  conversationFilter,
  displayHandle,
  isConversationMessage,
  oppositeRole,
} from '@/lib/chat/utils';
import { parseHandshakeMessagePayload } from '@/lib/messages/handshake-payload';
import { ChatAvatar } from '@/components/chat/chat-avatar';
import { ChatThreadSkeleton } from '@/components/chat/chat-skeletons';
import { HandshakeCard } from '@/components/chat/handshake-card';
import { HandshakePanel } from '@/components/chat/handshake-panel';
import { cn } from '@/lib/utils';
import { useEmergencyPause } from '@/lib/hooks/use-emergency-pause';
import { CHAT_PAGE_SIZE } from '@/app/actions/social-network';

type ChatRoomProps = {
  peerUserId: string;
  /** When true, fills parent (e.g. PremiumChatShell conversation pane) instead of page chrome. */
  embedded?: boolean;
  onBack?: () => void;
};

function formatSeenTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatLastSeen(iso: string): string {
  const d = new Date(iso);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function ChatRoom({ peerUserId, embedded = false, onBack }: ChatRoomProps) {
  const supabase = useMemo(() => createClient(), []);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialScrollDoneRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<MemberRole | null>(null);
  const [peer, setPeer] = useState<ChatPeer | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [handshakeMap, setHandshakeMap] = useState<Record<string, HandshakeRow>>({});
  const [peerPresence, setPeerPresence] = useState<UserPresence | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPropose, setShowPropose] = useState(false);
  const [canHandshake, setCanHandshake] = useState(false);
  const { paused: emergencyPause } = useEmergencyPause();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('none');
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [connectPending, startConnectTransition] = useTransition();

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, []);

  const loadHandshakes = useCallback(
    async (currentUserId: string, otherUserId: string) => {
      const { data } = await supabase
        .from('handshakes')
        .select('*')
        .or(
          `and(lender_id.eq.${currentUserId},borrower_id.eq.${otherUserId}),and(lender_id.eq.${otherUserId},borrower_id.eq.${currentUserId})`
        )
        .order('created_at', { ascending: false });

      const rows = (data ?? []) as HandshakeRow[];
      const borrowerIds = [...new Set(rows.map((r) => r.borrower_id))];
      const mandateSet = new Set<string>();

      if (borrowerIds.length > 0) {
        const { data: mandates } = await supabase
          .from('gocardless_mandates')
          .select('user_id, status')
          .in('user_id', borrowerIds)
          .eq('status', 'active');
        for (const m of mandates ?? []) {
          mandateSet.add(m.user_id as string);
        }
      }

      const map: Record<string, HandshakeRow> = {};
      for (const row of rows) {
        const linked =
          mandateSet.has(row.borrower_id) ||
          row.payment_status === 'ACTIVE' ||
          row.payment_status === 'PAID' ||
          Boolean(row.gocardless_subscription_id) ||
          Boolean(row.auto_emi_active);
        map[row.id] = normalizeHandshakeRow(
          { ...row, mandate_linked: linked } as Record<string, unknown>,
          row
        );
      }
      setHandshakeMap(map);
      return map;
    },
    [supabase]
  );

  const fetchMessages = useCallback(
    async (currentUserId: string, otherUserId: string, offset = 0, append = false) => {
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, is_read, read_at, created_at')
        .or(conversationFilter(currentUserId, otherUserId))
        .order('created_at', { ascending: false })
        .range(offset, offset + CHAT_PAGE_SIZE - 1);

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      const chronological = ([...(data ?? [])] as ChatMessage[]).reverse();
      setHasMoreMessages((data ?? []).length >= CHAT_PAGE_SIZE);
      setMessages((prev) => {
        if (!append) return chronological;
        const seen = new Set(prev.map((m) => m.id));
        return [...chronological.filter((m) => !seen.has(m.id)), ...prev];
      });
      if (!append) await loadHandshakes(currentUserId, otherUserId);
    },
    [loadHandshakes, supabase]
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setError(null);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error(authError?.message || 'Sign in required.');
        }

        const { data: myProfile, error: myProfileError } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', user.id)
          .maybeSingle();

        if (myProfileError) {
          throw new Error(`Profile load failed: ${myProfileError.message}`);
        }
        if (!myProfile) {
          throw new Error('Profile not found.');
        }

        const role = myProfile.role as MemberRole;
        if (role !== 'INVESTOR' && role !== 'BORROWER') {
          throw new Error('Chat unavailable for this account type.');
        }

        const { data: peerProfile, error: peerError } = await supabase
          .from('profiles')
          .select('id, role, full_legal_name, username, avatar_url')
          .eq('id', peerUserId)
          .eq('status', 'APPROVED')
          .eq('role', oppositeRole(role))
          .neq('role', 'ADMIN')
          .maybeSingle();

        if (peerError) {
          throw new Error(`Peer profile load failed: ${peerError.message}`);
        }
        if (!peerProfile) {
          throw new Error('Handshake chat is only available between a borrower and an investor.');
        }

        const uid = myProfile.id as string;
        if (cancelled) return;

        setMyId(uid);
        setMyRole(role);
        setPeer(peerProfile as ChatPeer);
        setCanHandshake(true);

        // Connection gate — fetch once on load
        const { status: connStatus, connectionId: connId } = await getConnectionStatus(peerUserId);
        if (!cancelled) {
          setConnectionStatus(connStatus);
          setConnectionId(connId);
        }

        const { data: presence } = await supabase
          .from('user_presence')
          .select('user_id, status, last_seen')
          .eq('user_id', peerUserId)
          .maybeSingle();

        if (!cancelled) setPeerPresence((presence as UserPresence) ?? null);

        await fetchMessages(uid, peerUserId);
        await markConversationRead(peerUserId);
        window.dispatchEvent(new CustomEvent('oxyile:chat-read'));
      } catch (err) {
        console.error('🚨 CHAT ROOM FETCH ERROR:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load chat room');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
      initialScrollDoneRef.current = false;
    };
  }, [fetchMessages, peerUserId, supabase]);

  // Presence + realtime only after myId is known (initial fetch completed).
  useEffect(() => {
    if (!myId) return;
    const setPresence = async (status: 'online' | 'offline') => {
      await supabase.from('user_presence').upsert({
        user_id: myId,
        status,
        last_seen: new Date().toISOString(),
      });
    };
    void setPresence('online');
    const onUnload = () => void setPresence('offline');
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      void setPresence('offline');
    };
  }, [myId, supabase]);

  useEffect(() => {
    if (!myId || !peer) return;

    const channel = supabase
      .channel(`chat-room-${myId}-${peer.id}`, { config: { broadcast: { self: false } } })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const next = payload.new as ChatMessage;
        if (!isConversationMessage(next, myId, peer.id)) return;
        setMessages((current) => {
          if (current.some((m) => m.id === next.id)) return current;
          return [...current, next];
        });
        if (next.sender_id === peer.id) {
          void markConversationRead(peerUserId);
          window.dispatchEvent(new CustomEvent('oxyile:chat-read'));
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        const updated = payload.new as ChatMessage;
        setMessages((current) => current.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'handshakes' }, (payload) => {
        const updated = payload.new as Record<string, unknown>;
        const id = updated.id as string | undefined;
        if (!id) return;

        const inConversation =
          (updated.lender_id === myId && updated.borrower_id === peer.id) ||
          (updated.lender_id === peer.id && updated.borrower_id === myId);

        if (!inConversation) return;

        setHandshakeMap((current) => {
          const previous = current[id];
          if (!previous) {
            void loadHandshakes(myId, peer.id);
            return current;
          }
          return {
            ...current,
            [id]: normalizeHandshakeRow(updated, previous),
          };
        });

        // Guarantor acceptance can arrive via service-role writes — refetch to stay in sync.
        if (String(updated.guarantor_status ?? '').toLowerCase() === 'accepted') {
          void loadHandshakes(myId, peer.id);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'handshakes' }, () => {
        void loadHandshakes(myId, peer.id);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence', filter: `user_id=eq.${peer.id}` }, (payload) => {
        setPeerPresence(payload.new as UserPresence);
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const data = payload as { userId?: string; typing?: boolean };
        if (data.userId === peer.id) setPeerTyping(Boolean(data.typing));
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [loadHandshakes, myId, peer, peerUserId, supabase]);

  // Room-level polling while any handshake still awaits guarantor acceptance.
  const needsGuarantorPoll = Object.values(handshakeMap).some((row) => {
    const status = String(row.guarantor_status ?? 'none').toLowerCase();
    return status === 'pending' || status === 'invited' || status === 'none';
  });

  useEffect(() => {
    if (!myId || !peer || !needsGuarantorPoll) return;
    const intervalId = window.setInterval(() => {
      void loadHandshakes(myId, peer.id);
    }, 4000);
    return () => window.clearInterval(intervalId);
  }, [loadHandshakes, myId, needsGuarantorPoll, peer]);

  // Scroll after the message list mounts (not while the loading spinner is showing).
  useEffect(() => {
    if (loading) return;

    if (!initialScrollDoneRef.current) {
      // Double rAF waits for layout after switching from spinner → message list.
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom('auto');
          initialScrollDoneRef.current = true;
        });
      });
      return () => cancelAnimationFrame(id);
    }

    scrollToBottom('smooth');
  }, [loading, messages, scrollToBottom]);

  const broadcastTyping = (typing: boolean) => {
    channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: myId, typing } });
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const content = text.trim();
    if (!content || !myId || !peer || sending) return;

    setText('');
    broadcastTyping(false);
    setSending(true);

    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: optimisticId,
      sender_id: myId,
      receiver_id: peer.id,
      content,
      is_read: false,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    const { data, error: insertError } = await supabase
      .from('messages')
      .insert({
        sender_id: myId,
        receiver_id: peer.id,
        content,
      })
      .select('id, sender_id, receiver_id, content, is_read, read_at, created_at')
      .single();

    if (insertError) {
      setText(content);
      setError(insertError.message);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    } else if (data) {
      setMessages((prev) =>
        prev
          .map((m) => (m.id === optimisticId ? (data as ChatMessage) : m))
          .filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
      );
      void notifyChatMessagePush({
        receiverId: peer.id,
        preview: content.slice(0, 120),
      });
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col">
        <ChatThreadSkeleton />
      </div>
    );
  }

  if (error && !peer) {
    return (
      <section className="mx-auto max-w-lg px-4 py-8 text-center">
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
        <Link href="/chats" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-600">
          <ArrowLeft size={16} /> Back to inbox
        </Link>
      </section>
    );
  }

  if (!peer || !myId || !myRole) return null;

  const presenceLabel =
    peerPresence?.status === 'online'
      ? 'Online'
      : peerPresence?.last_seen
        ? `Last seen ${formatLastSeen(peerPresence.last_seen)}`
        : 'Offline';

  return (
    <div
      className={cn(
        'flex flex-col',
        embedded
          ? 'h-full min-h-0 w-full max-w-none'
          : 'mx-auto h-[calc(100dvh-4rem-5.5rem-env(safe-area-inset-bottom))] max-w-lg -mb-[calc(5.5rem+env(safe-area-inset-bottom))]'
      )}
    >
      <header className="glass-card z-10 flex shrink-0 items-center gap-3 rounded-b-2xl border-x-0 border-t-0 border-white/60 px-4 py-3 dark:border-white/10">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to inbox"
            className="grid h-9 w-9 place-items-center rounded-full text-brand-600"
          >
            <ArrowLeft size={20} />
          </button>
        ) : (
          <Link href="/chats" aria-label="Back" className="grid h-9 w-9 place-items-center rounded-full text-brand-600">
            <ArrowLeft size={20} />
          </Link>
        )}
        <div className="relative shrink-0">
          <ChatAvatar name={peer.full_legal_name} avatarUrl={peer.avatar_url} size="md" />
          {peerPresence?.status === 'online' && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-neutral-950 dark:text-white">{peer.full_legal_name}</p>
          <p className="truncate text-xs text-neutral-500">{displayHandle(peer.username, peer.full_legal_name)} · {presenceLabel}</p>
        </div>
      </header>

      {error && (
        <p className="mx-4 mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{error}</p>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {hasMoreMessages && myId && peer ? (
          <div className="flex justify-center pb-1">
            <button
              type="button"
              disabled={loadingOlder}
              onClick={() => {
                setLoadingOlder(true);
                void fetchMessages(myId, peer.id, messages.length, true).finally(() =>
                  setLoadingOlder(false)
                );
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#F97316]/35 bg-[#F97316]/10 px-3 py-1.5 text-[11px] font-bold text-[#F97316] disabled:opacity-60"
            >
              {loadingOlder ? <Loader2 size={12} className="animate-spin" /> : null}
              {loadingOlder ? 'Loading…' : 'Load older'}
            </button>
          </div>
        ) : null}
        {messages.length === 0 ? (
          <p className="text-center text-sm text-neutral-500">Say hello — or send a handshake proposal.</p>
        ) : (
          messages.map((message) => {
            const handshakeId = parseHandshakeMessagePayload(message.content);
            const handshake = handshakeId ? handshakeMap[handshakeId] : null;
            const mine = message.sender_id === myId;

            if (handshakeId) {
              if (handshake) {
                return (
                  <div key={message.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                    <HandshakeCard
                      handshake={handshake}
                      myId={myId}
                      myRole={myRole}
                      peer={peer}
                      onUpdated={() => loadHandshakes(myId, peer.id)}
                    />
                  </div>
                );
              }
              return (
                <div key={message.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div className="max-w-[85%] rounded-2xl border border-[#F97316]/30 bg-[#F97316]/10 px-4 py-3 text-sm text-[#F97316]">
                    Loading handshake proposal…
                  </div>
                </div>
              );
            }

            return (
              <div key={message.id} className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                    mine ? 'bg-brand-500 text-white' : 'glass-card border border-white/50 dark:border-white/10'
                  )}
                >
                  {message.content}
                </div>
                {mine && (
                  <p className="mt-1 px-1 text-[10px] text-neutral-500">
                    {message.is_read && message.read_at ? `✓ Seen ${formatSeenTime(message.read_at)}` : 'Sent'}
                  </p>
                )}
              </div>
            );
          })
        )}
        {peerTyping && (
          <p className="animate-pulse text-xs font-medium text-brand-600">{peer.full_legal_name} is typing…</p>
        )}
        <div ref={messagesEndRef} />
      </div>

      <HandshakePanel
        open={showPropose}
        onClose={() => setShowPropose(false)}
        myId={myId}
        myRole={myRole}
        peerId={peer.id}
        handshakes={Object.values(handshakeMap)}
        onRefresh={() => {
          void loadHandshakes(myId, peer.id);
          void fetchMessages(myId, peer.id);
        }}
      />

      {/* ── Connection Barrier ── */}
      {connectionStatus !== 'accepted' && (
        <div className="mx-4 mb-2 overflow-hidden rounded-2xl border border-[#F97316]/30 bg-[#F97316]/5 p-4 text-center">
          <Lock size={20} className="mx-auto mb-2 text-[#F97316]" />
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            {connectionStatus === 'pending_sent'
              ? 'Connection request sent'
              : connectionStatus === 'pending_received'
                ? 'This person wants to connect with you'
                : 'Connect to send a message'}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {connectionStatus === 'pending_sent'
              ? 'Waiting for them to accept. You can message once connected.'
              : connectionStatus === 'pending_received'
                ? 'Accept their request to start chatting.'
                : 'Send a connection request to unlock messaging.'}
          </p>
          <div className="mt-3 flex justify-center gap-2">
            {connectionStatus === 'none' && (
              <button
                type="button"
                disabled={connectPending}
                onClick={() =>
                  startConnectTransition(async () => {
                    const res = await sendConnectionRequest(peerUserId);
                    if (res.ok) {
                      setConnectionStatus('pending_sent');
                      setConnectionId(res.id);
                    }
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-full bg-[#F97316] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {connectPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Connect
              </button>
            )}
            {connectionStatus === 'pending_received' && connectionId && (
              <button
                type="button"
                disabled={connectPending}
                onClick={() =>
                  startConnectTransition(async () => {
                    const res = await (await import('@/app/actions/connections')).acceptConnectionRequest(connectionId);
                    if (res.ok) setConnectionStatus('accepted');
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {connectPending ? <Loader2 size={14} className="animate-spin" /> : 'Accept & Chat'}
              </button>
            )}
          </div>
        </div>
      )}

      <form
        onSubmit={sendMessage}
        className="relative z-20 shrink-0 border-t border-gray-200 bg-white/95 px-3 py-3 dark:border-neutral-800 dark:bg-[#0a0a0a]/95"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (emergencyPause || connectionStatus !== 'accepted') return;
              setShowPropose(true);
            }}
            disabled={emergencyPause || connectionStatus !== 'accepted'}
            aria-label="New handshake proposal"
            title={
              emergencyPause
                ? 'Platform paused by admin'
                : connectionStatus !== 'accepted'
                  ? 'Connect first to initiate a handshake'
                  : 'New Handshake'
            }
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#F97316]/40 bg-[#F97316]/15 text-[#F97316] transition hover:border-[#F97316] hover:bg-[#F97316]/25 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Handshake size={18} strokeWidth={2.25} />
          </button>
          <input
            value={text}
            onChange={(e) => {
              if (connectionStatus !== 'accepted') return;
              setText(e.target.value);
              broadcastTyping(true);
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 1200);
            }}
            disabled={connectionStatus !== 'accepted'}
            placeholder={connectionStatus !== 'accepted' ? 'Connect first to send messages…' : 'Type a message…'}
            className="h-10 min-w-0 flex-1 rounded-full border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none placeholder:text-gray-500 focus:border-[#F97316]/60 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-[#111] dark:text-white dark:placeholder:text-neutral-500"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending || connectionStatus !== 'accepted'}
            aria-label="Send message"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F97316] text-white transition hover:bg-[#ea580c] disabled:opacity-40"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </form>
    </div>
  );
}
