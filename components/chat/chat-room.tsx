'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { markConversationRead } from '@/app/actions/chat';
import type { ChatMessage, ChatPeer, HandshakeRow, MemberRole, UserPresence } from '@/lib/chat/types';
import {
  conversationFilter,
  displayHandle,
  isConversationMessage,
  oppositeRole,
} from '@/lib/chat/utils';
import { ChatAvatar } from '@/components/chat/chat-avatar';
import { HandshakePanel } from '@/components/chat/handshake-panel';
import { cn } from '@/lib/utils';

type ChatRoomProps = {
  peerUserId: string;
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

export function ChatRoom({ peerUserId }: ChatRoomProps) {
  const supabase = useMemo(() => createClient(), []);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<MemberRole | null>(null);
  const [peer, setPeer] = useState<ChatPeer | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [handshakes, setHandshakes] = useState<HandshakeRow[]>([]);
  const [peerPresence, setPeerPresence] = useState<UserPresence | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showHandshake, setShowHandshake] = useState(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, []);

  const fetchMessages = useCallback(
    async (currentUserId: string, otherUserId: string) => {
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, is_read, read_at, created_at')
        .or(conversationFilter(currentUserId, otherUserId))
        .order('created_at', { ascending: true })
        .limit(200);

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setMessages((data ?? []) as ChatMessage[]);
    },
    [supabase]
  );

  const fetchHandshakes = useCallback(
    async (currentUserId: string, otherUserId: string) => {
      const { data } = await supabase
        .from('handshakes')
        .select('*')
        .or(
          `and(lender_id.eq.${currentUserId},borrower_id.eq.${otherUserId}),and(lender_id.eq.${otherUserId},borrower_id.eq.${currentUserId})`
        )
        .order('created_at', { ascending: false })
        .limit(10);

      setHandshakes((data ?? []) as HandshakeRow[]);
    },
    [supabase]
  );

  const markRead = useCallback(async () => {
    await markConversationRead(peerUserId);
    window.dispatchEvent(new CustomEvent('oxyile:chat-read'));
    setMessages((current) =>
      current.map((m) =>
        m.sender_id === peerUserId && m.receiver_id === myId
          ? { ...m, is_read: true, read_at: m.read_at ?? new Date().toISOString() }
          : m
      )
    );
  }, [peerUserId, myId]);

  const setPresence = useCallback(
    async (status: 'online' | 'offline') => {
      if (!myId) return;
      await supabase.from('user_presence').upsert({
        user_id: myId,
        status,
        last_seen: new Date().toISOString(),
      });
    },
    [myId, supabase]
  );

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('Sign in required.');
        setLoading(false);
        return;
      }

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle();

      if (!myProfile) {
        setError('Profile not found.');
        setLoading(false);
        return;
      }

      const role = myProfile.role as MemberRole;
      if (role !== 'INVESTOR' && role !== 'BORROWER') {
        setError('Chat unavailable for this account type.');
        setLoading(false);
        return;
      }

      const { data: peerProfile } = await supabase
        .from('profiles')
        .select('id, role, full_legal_name, username, avatar_url')
        .eq('id', peerUserId)
        .eq('status', 'APPROVED')
        .eq('role', oppositeRole(role))
        .maybeSingle();

      if (!peerProfile) {
        setError('This user is not available to chat.');
        setLoading(false);
        return;
      }

      const uid = myProfile.id as string;
      setMyId(uid);
      setMyRole(role);
      setPeer(peerProfile as ChatPeer);

      const { data: presence } = await supabase
        .from('user_presence')
        .select('user_id, status, last_seen')
        .eq('user_id', peerUserId)
        .maybeSingle();

      setPeerPresence((presence as UserPresence) ?? null);

      await Promise.all([fetchMessages(uid, peerUserId), fetchHandshakes(uid, peerUserId)]);
      await markConversationRead(peerUserId);
      window.dispatchEvent(new CustomEvent('oxyile:chat-read'));

      setLoading(false);
      requestAnimationFrame(() => scrollToBottom('auto'));
    }

    void bootstrap();
  }, [fetchHandshakes, fetchMessages, peerUserId, scrollToBottom, supabase]);

  useEffect(() => {
    if (!myId) return;
    void setPresence('online');

    const onUnload = () => {
      void setPresence('offline');
    };
    window.addEventListener('beforeunload', onUnload);

    return () => {
      window.removeEventListener('beforeunload', onUnload);
      void setPresence('offline');
    };
  }, [myId, setPresence]);

  useEffect(() => {
    if (!myId || !peer) return;

    const channel = supabase
      .channel(`chat-room-${myId}-${peer.id}`, {
        config: { broadcast: { self: false } },
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const next = payload.new as ChatMessage;
          if (!isConversationMessage(next, myId, peer.id)) return;

          setMessages((current) => {
            if (current.some((m) => m.id === next.id)) return current;
            return [...current, next];
          });

          if (next.sender_id === peer.id) {
            void markRead();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const updated = payload.new as ChatMessage;
          setMessages((current) =>
            current.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_presence', filter: `user_id=eq.${peer.id}` },
        (payload) => {
          setPeerPresence(payload.new as UserPresence);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'handshakes' },
        () => {
          void fetchHandshakes(myId, peer.id);
        }
      )
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
  }, [fetchHandshakes, markRead, myId, peer, supabase]);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const broadcastTyping = (typing: boolean) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: myId, typing },
    });
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const content = text.trim();
    if (!content || !myId || !peer || sending) return;

    setText('');
    broadcastTyping(false);
    setSending(true);

    const { error: insertError } = await supabase.from('messages').insert({
      sender_id: myId,
      receiver_id: peer.id,
      content,
    });

    if (insertError) {
      setText(content);
      setError(insertError.message);
    }

    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    );
  }

  if (error && !peer) {
    return (
      <section className="mx-auto max-w-lg px-4 py-8 text-center">
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
        <Link
          href="/chats"
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 dark:text-brand-300"
        >
          <ArrowLeft size={16} />
          Back to inbox
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
    <div className="mx-auto flex h-[calc(100dvh-4rem-5.5rem-env(safe-area-inset-bottom))] max-w-lg flex-col -mb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <header className="glass-card z-10 flex shrink-0 items-center gap-3 rounded-b-2xl border-x-0 border-t-0 border-white/60 px-4 py-3 dark:border-white/10">
        <Link
          href="/chats"
          aria-label="Back to inbox"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-brand-600 transition hover:bg-brand-500/10 dark:text-brand-300"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="relative shrink-0">
          <ChatAvatar name={peer.full_legal_name} avatarUrl={peer.avatar_url} size="md" />
          {peerPresence?.status === 'online' && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-neutral-900" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-neutral-950 dark:text-white">{peer.full_legal_name}</p>
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
            {displayHandle(peer.username, peer.full_legal_name)} · {presenceLabel}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full bg-brand-500 px-3 py-2 text-[11px] font-bold text-white shadow-glow transition hover:bg-brand-400 sm:px-4 sm:text-xs"
          onClick={() => setShowHandshake((v) => !v)}
        >
          🤝 Propose Handshake
        </button>
      </header>

      {showHandshake && myRole && (
        <HandshakePanel
          open={showHandshake}
          onClose={() => setShowHandshake(false)}
          myId={myId}
          myRole={myRole}
          peerId={peer.id}
          handshakes={handshakes}
          onRefresh={() => fetchHandshakes(myId, peer.id)}
        />
      )}

      {error ? (
        <p className="mx-4 mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          {error}
        </p>
      ) : null}

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-label="Message feed">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            Say hello — start the conversation.
          </p>
        ) : (
          messages.map((message) => {
            const mine = message.sender_id === myId;
            return (
              <div key={message.id} className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm',
                    mine
                      ? 'bg-brand-500 text-white'
                      : 'glass-card border border-white/50 text-neutral-900 dark:border-white/10 dark:text-neutral-100'
                  )}
                >
                  {message.content}
                </div>
                {mine && (
                  <p className="mt-1 px-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                    {message.is_read && message.read_at
                      ? `✓ Seen ${formatSeenTime(message.read_at)}`
                      : 'Sent'}
                  </p>
                )}
              </div>
            );
          })
        )}

        {peerTyping && (
          <p className="animate-pulse text-xs font-medium text-brand-600 dark:text-brand-300">
            {peer.full_legal_name} is typing…
          </p>
        )}

        <div ref={bottomRef} aria-hidden />
      </div>

      <form
        onSubmit={sendMessage}
        className="glass-card shrink-0 border-x-0 border-b-0 border-white/60 px-3 py-3 dark:border-white/10"
      >
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              broadcastTyping(true);
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 1200);
            }}
            placeholder="Type a message…"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-full border border-white/50 bg-white/80 px-4 py-2.5 text-sm outline-none ring-brand-500/30 placeholder:text-neutral-400 focus:ring-2 dark:border-white/10 dark:bg-black/40 dark:text-white"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            aria-label="Send message"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-500 text-white shadow-glow transition hover:bg-brand-400 disabled:opacity-50"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </form>
    </div>
  );
}
