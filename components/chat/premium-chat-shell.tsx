'use client';

import { FormEvent, useEffect, useMemo, useState, useTransition } from 'react';
import { ArrowLeft, Loader2, MessageCircle, Plus, Search, Send, Users, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { markConversationRead } from '@/app/actions/chat';
import { listMyConnections } from '@/app/actions/connections';
import { createChatGroup, CHAT_PAGE_SIZE, listGroupMessages, listMyChatGroups, type GroupMessage } from '@/app/actions/social-network';
import { ChatAvatar } from '@/components/chat/chat-avatar';
import { ChatRoom } from '@/components/chat/chat-room';
import { ChatInboxListSkeleton, ChatThreadSkeleton } from '@/components/chat/chat-skeletons';
import { IncomingRequestsPanel, useIncomingRequestCount } from '@/components/social/incoming-requests-panel';
import { cn } from '@/lib/utils';

type Friend = Awaited<ReturnType<typeof listMyConnections>>[number];
type Group = Awaited<ReturnType<typeof listMyChatGroups>>[number];

type ActiveChat =
  | { kind: 'friend'; id: string; name: string; avatar: string | null; role: string }
  | { kind: 'group'; id: string; name: string };

type DirectMessage = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

function normalizeRole(role: string | null | undefined) {
  return String(role ?? '')
    .trim()
    .toUpperCase();
}

/** Handshake UI only between opposite lending roles — never same-role DMs. */
function isP2PLendingPair(myRole: string, peerRole: string) {
  const me = normalizeRole(myRole);
  const peer = normalizeRole(peerRole);
  return (me === 'INVESTOR' && peer === 'BORROWER') || (me === 'BORROWER' && peer === 'INVESTOR');
}

function timeShort(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function CreateGroupModal({
  open,
  friends,
  onClose,
  onDone,
}: {
  open: boolean;
  friends: Friend[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/80 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-[#0a0a0a] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-black text-white">Create New Group</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-neutral-400 hover:bg-white/5">
            <X size={16} />
          </button>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Group name"
          className="mb-3 h-10 w-full rounded-xl border border-neutral-700 bg-black px-3 text-sm text-white outline-none focus:border-[#F97316]/70"
        />
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">Accepted Friends</p>
        <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-neutral-800 p-2">
          {friends.map((f) => {
            const selected = picked.includes(f.userId);
            return (
              <button
                key={f.userId}
                type="button"
                onClick={() =>
                  setPicked((curr) =>
                    curr.includes(f.userId) ? curr.filter((id) => id !== f.userId) : [...curr, f.userId]
                  )
                }
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm',
                  selected ? 'bg-[#F97316]/15 text-[#F97316]' : 'text-neutral-300 hover:bg-white/5'
                )}
              >
                <ChatAvatar name={f.full_legal_name} avatarUrl={f.avatar_url} size="sm" />
                <span className="truncate">{f.full_legal_name}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          disabled={pending || !name.trim() || picked.length === 0}
          onClick={() =>
            startTransition(async () => {
              const res = await createChatGroup({ name, memberIds: picked });
              if (!res.ok) return;
              setName('');
              setPicked([]);
              onDone();
              onClose();
            })
          }
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#F97316] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Create Group
        </button>
      </div>
    </div>
  );
}

export function PremiumChatShell({ initialPeerId }: { initialPeerId?: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [myId, setMyId] = useState<string>('');
  const [myRole, setMyRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [active, setActive] = useState<ActiveChat | null>(null);
  const [messages, setMessages] = useState<(DirectMessage | GroupMessage)[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const { count: incomingCount } = useIncomingRequestCount();
  const [, startTransition] = useTransition();

  // Handshake room only for Borrower ↔ Investor (never same-role).
  const useHandshakeRoom =
    active?.kind === 'friend' && isP2PLendingPair(myRole, active.role);

  const filteredFriends = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter(
      (f) =>
        f.full_legal_name.toLowerCase().includes(q) ||
        (f.username ?? '').toLowerCase().includes(q)
    );
  }, [friends, query]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, query]);

  const refreshSidebar = async () => {
    const [friendRows, groupRows] = await Promise.all([listMyConnections(), listMyChatGroups()]);
    setFriends(friendRows);
    setGroups(groupRows);
  };

  useEffect(() => {
    let mounted = true;
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !mounted) return;
      setMyId(user.id);
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (mounted) setMyRole(normalizeRole(profile?.role as string | undefined));
      await refreshSidebar();
      if (mounted) setLoading(false);
    }
    void init();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    const onChanged = () => {
      void refreshSidebar();
    };
    window.addEventListener('oxyile:connections-changed', onChanged);
    const channel = supabase
      .channel('chat-connections-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_connections' }, onChanged)
      .subscribe();
    return () => {
      window.removeEventListener('oxyile:connections-changed', onChanged);
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    if (!initialPeerId || friends.length === 0) return;
    const peer = friends.find((f) => f.userId === initialPeerId);
    if (peer) void openFriendChat(peer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once when friends load
  }, [initialPeerId, friends]);

  // Social DM realtime (handshake pairs use ChatRoom instead).
  useEffect(() => {
    if (!active || !myId || useHandshakeRoom) return;
    const current = active;
    let cancelled = false;

    async function loadMessages() {
      setMessagesLoading(true);
      setHasMoreMessages(false);
      try {
        if (current.kind === 'friend') {
          const { data } = await supabase
            .from('messages')
            .select('id, sender_id, content, created_at')
            .or(
              `and(sender_id.eq.${myId},receiver_id.eq.${current.id}),and(sender_id.eq.${current.id},receiver_id.eq.${myId})`
            )
            .order('created_at', { ascending: false })
            .range(0, CHAT_PAGE_SIZE - 1);
          if (!cancelled) {
            const chronological = ([...(data ?? [])] as DirectMessage[]).reverse();
            setMessages(chronological.map((m) => ({ ...m })));
            setHasMoreMessages((data ?? []).length >= CHAT_PAGE_SIZE);
          }
          await markConversationRead(current.id);
          window.dispatchEvent(new CustomEvent('oxyile:chat-read'));
        } else {
          const rows = await listGroupMessages(current.id, CHAT_PAGE_SIZE, 0);
          if (!cancelled) {
            setMessages(rows);
            setHasMoreMessages(rows.length >= CHAT_PAGE_SIZE);
          }
        }
      } finally {
        if (!cancelled) setMessagesLoading(false);
      }
    }

    void loadMessages();

    const table = current.kind === 'friend' ? 'messages' : 'chat_group_messages';
    const channel = supabase
      .channel(`premium-chat-live-${current.kind}-${current.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table }, (payload) => {
        const row = payload.new as Record<string, unknown>;
        if (current.kind === 'friend') {
          const msg = row as unknown as DirectMessage;
          const inThread =
            (msg.sender_id === myId && (row.receiver_id as string) === current.id) ||
            (msg.sender_id === current.id && (row.receiver_id as string) === myId);
          if (!inThread) return;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          if (msg.sender_id === current.id) {
            void markConversationRead(current.id);
            window.dispatchEvent(new CustomEvent('oxyile:chat-read'));
          }
          return;
        }
        const groupId = String(row.group_id ?? '');
        if (groupId !== current.id) return;
        const msg = {
          id: String(row.id),
          sender_id: String(row.sender_id),
          content: String(row.content ?? ''),
          created_at: String(row.created_at),
          sender_name: 'Member',
          sender_avatar: null,
        } as GroupMessage;
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [active, myId, supabase, useHandshakeRoom]);

  const loadOlderMessages = () => {
    if (!active || !myId || loadingOlder || !hasMoreMessages || useHandshakeRoom) return;
    const current = active;
    setLoadingOlder(true);
    startTransition(async () => {
      try {
        if (current.kind === 'friend') {
          const { data } = await supabase
            .from('messages')
            .select('id, sender_id, content, created_at')
            .or(
              `and(sender_id.eq.${myId},receiver_id.eq.${current.id}),and(sender_id.eq.${current.id},receiver_id.eq.${myId})`
            )
            .order('created_at', { ascending: false })
            .range(messages.length, messages.length + CHAT_PAGE_SIZE - 1);
          const chronological = ([...(data ?? [])] as DirectMessage[]).reverse();
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            return [...chronological.filter((m) => !seen.has(m.id)), ...prev];
          });
          setHasMoreMessages((data ?? []).length >= CHAT_PAGE_SIZE);
        } else {
          const rows = await listGroupMessages(current.id, CHAT_PAGE_SIZE, messages.length);
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            return [...rows.filter((m) => !seen.has(m.id)), ...prev];
          });
          setHasMoreMessages(rows.length >= CHAT_PAGE_SIZE);
        }
      } finally {
        setLoadingOlder(false);
      }
    });
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!active || !myId || !text.trim() || useHandshakeRoom) return;
    const content = text.trim();
    const optimisticId = `optimistic-${Date.now()}`;
    setText('');

    if (active.kind === 'friend') {
      const optimistic: DirectMessage = {
        id: optimisticId,
        sender_id: myId,
        content,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      const { data, error } = await supabase
        .from('messages')
        .insert({ sender_id: myId, receiver_id: active.id, content })
        .select('id, sender_id, content, created_at')
        .single();
      if (!error && data) {
        const msg = data as DirectMessage;
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticId ? msg : m)).filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
        );
      } else {
        setText(content);
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      }
      return;
    }

    const optimisticGroup = {
      id: optimisticId,
      sender_id: myId,
      content,
      created_at: new Date().toISOString(),
      sender_name: 'You',
      sender_avatar: null,
    } as GroupMessage;
    setMessages((prev) => [...prev, optimisticGroup]);
    const { data, error } = await supabase
      .from('chat_group_messages')
      .insert({ group_id: active.id, sender_id: myId, content })
      .select('id, group_id, sender_id, content, created_at')
      .single();
    if (!error && data) {
      const msg = {
        id: String(data.id),
        sender_id: String(data.sender_id),
        content: String(data.content ?? ''),
        created_at: String(data.created_at),
        sender_name: 'You',
        sender_avatar: null,
      } as GroupMessage;
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? msg : m)).filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
      );
    } else {
      setText(content);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    }
  };

  const openFriendChat = async (f: Friend) => {
    // Fresh role from profiles so handshake gating stays accurate.
    const { data: peerProfile } = await supabase
      .from('profiles')
      .select('role, full_legal_name, username, avatar_url')
      .eq('id', f.userId)
      .maybeSingle();
    const peerRole = normalizeRole(peerProfile?.role ?? f.role);
    setActive({
      kind: 'friend',
      id: f.userId,
      name: String(peerProfile?.full_legal_name ?? f.full_legal_name),
      avatar: (peerProfile?.avatar_url as string | null) ?? f.avatar_url,
      role: peerRole,
    });
  };

  const clearActive = () => {
    setActive(null);
    setText('');
    setMessages([]);
  };

  const inboxPanel = (
    <aside
      className={cn(
        'min-h-0 flex-col border-gray-200 bg-gray-50 dark:border-neutral-800 dark:bg-[#111]',
        // Mobile Instagram: list only when no chat selected
        active ? 'hidden' : 'flex',
        // Desktop: always show inbox column
        'md:flex md:col-span-4 md:border-r'
      )}
    >
      <div className="shrink-0 border-b border-gray-200 p-3 dark:border-neutral-800">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-sm font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white">Inbox</h1>
          <button
            type="button"
            onClick={() => setGroupModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-full bg-[#F97316]/15 px-2.5 py-1 text-xs font-bold text-[#F97316]"
          >
            <Plus size={12} />
            Group
          </button>
        </div>
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search friends or groups..."
            className="h-9 w-full rounded-xl border border-gray-300 bg-white pl-8 pr-3 text-sm text-gray-900 outline-none focus:border-[#F97316]/60 dark:border-neutral-700 dark:bg-black dark:text-white"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-gray-200 dark:border-neutral-800">
          <p className="flex items-center gap-2 px-3 pt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
            Incoming Requests
            {incomingCount > 0 ? (
              <span className="inline-flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#F97316] px-1 text-[10px] font-bold text-white">
                {incomingCount}
              </span>
            ) : null}
          </p>
          <IncomingRequestsPanel compact onChanged={() => void refreshSidebar()} />
        </div>

        <p className="px-3 pt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Friends</p>
        {loading ? (
          <ChatInboxListSkeleton count={6} />
        ) : filteredFriends.length === 0 ? (
          <p className="px-3 py-3 text-xs text-neutral-500">Accept a request to unlock DMs.</p>
        ) : null}
        {!loading &&
          filteredFriends.map((f) => (
          <button
            key={f.userId}
            type="button"
            onClick={() => void openFriendChat(f)}
            className={cn(
              'flex w-full items-center gap-2.5 px-3 py-2 text-left transition',
              active?.kind === 'friend' && active.id === f.userId ? 'bg-[#F97316]/12' : 'hover:bg-white/5'
            )}
          >
            <ChatAvatar name={f.full_legal_name} avatarUrl={f.avatar_url} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{f.full_legal_name}</p>
              <p className="truncate text-[11px] text-neutral-400">@{f.username || 'oxyile'}</p>
            </div>
          </button>
        ))}

        <p className="px-3 pt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Groups</p>
        {!loading &&
          filteredGroups.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setActive({ kind: 'group', id: g.id, name: g.name })}
            className={cn(
              'flex w-full items-center gap-2.5 px-3 py-2 text-left transition',
              active?.kind === 'group' && active.id === g.id ? 'bg-[#F97316]/12' : 'hover:bg-white/5'
            )}
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#F97316]/20 text-[#F97316]">
              <Users size={14} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{g.name}</p>
              <p className="text-[11px] text-neutral-400">{g.members_count} members</p>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );

  const conversationPanel = (
    <section
      className={cn(
        'min-h-0 flex-col bg-gray-50 dark:bg-[#0a0a0a]',
        // Mobile Instagram: conversation only when a chat is selected
        active ? 'flex' : 'hidden',
        // Desktop: always show conversation column
        'md:flex md:col-span-8'
      )}
    >
      {loading ? (
        <div className="grid flex-1 place-items-center md:hidden">
          <Loader2 size={20} className="animate-spin text-[#F97316]" />
        </div>
      ) : !active ? (
        <div className="grid flex-1 place-items-center px-6 text-center">
          <div>
            <MessageCircle size={30} className="mx-auto mb-3 text-[#F97316]" />
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Choose a friend or group to start chatting.</p>
            <p className="mt-2 text-xs text-neutral-500">Connected members can propose a handshake from inside the DM.</p>
          </div>
        </div>
      ) : useHandshakeRoom && active.kind === 'friend' ? (
        <div className="min-h-0 flex-1">
          <ChatRoom peerUserId={active.id} embedded onBack={clearActive} />
        </div>
      ) : (
        <>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-gray-200 px-3 dark:border-neutral-800 sm:gap-3 sm:px-4">
            <button
              type="button"
              onClick={clearActive}
              aria-label="Back to inbox"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#F97316] transition hover:bg-[#F97316]/10 md:hidden"
            >
              <ArrowLeft size={20} />
            </button>
            {active.kind === 'friend' ? (
              <ChatAvatar name={active.name} avatarUrl={active.avatar} size="sm" />
            ) : (
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#F97316]/20 text-[#F97316]">
                <Users size={14} />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{active.name}</p>
              <p className="text-[11px] text-neutral-400">{active.kind === 'friend' ? 'Direct message' : 'Group chat'}</p>
            </div>
          </header>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4 pb-2">
            {messagesLoading ? (
              <ChatThreadSkeleton />
            ) : (
              <>
                {hasMoreMessages ? (
                  <div className="flex justify-center pb-2">
                    <button
                      type="button"
                      onClick={loadOlderMessages}
                      disabled={loadingOlder}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#F97316]/35 bg-[#F97316]/10 px-3 py-1.5 text-[11px] font-bold text-[#F97316] disabled:opacity-60"
                    >
                      {loadingOlder ? <Loader2 size={12} className="animate-spin" /> : null}
                      {loadingOlder ? 'Loading…' : 'Load older'}
                    </button>
                  </div>
                ) : null}
                {messages.length === 0 ? (
                  <div className="grid h-full place-items-center text-sm text-neutral-500">No messages yet.</div>
                ) : (
                  messages.map((m) => {
                    const mine = m.sender_id === myId;
                    return (
                      <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                        <div
                          className={cn(
                            'max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm',
                            mine ? 'bg-[#F97316] text-white' : 'bg-[#1a1a1a] text-neutral-100',
                            m.id.startsWith('optimistic-') && 'opacity-80'
                          )}
                        >
                          {!mine && active.kind === 'group' && 'sender_name' in m && (
                            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-[#F97316]">{m.sender_name}</p>
                          )}
                          <p className="whitespace-pre-wrap">{m.content}</p>
                          <p className="mt-1 text-[10px] opacity-70">{timeShort(m.created_at)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>

          <form
            onSubmit={sendMessage}
            className="relative z-20 shrink-0 border-t border-gray-200 bg-gray-50 p-3 dark:border-neutral-800 dark:bg-[#0a0a0a]"
          >
            <div className="flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message..."
                className="h-10 min-w-0 flex-1 rounded-full border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none placeholder:text-gray-500 focus:border-[#F97316]/60 dark:border-neutral-700 dark:bg-[#111] dark:text-white dark:placeholder:text-neutral-500"
              />
              <button type="submit" className="grid h-10 w-10 place-items-center rounded-full bg-[#F97316] text-white">
                <Send size={16} />
              </button>
            </div>
          </form>
        </>
      )}
    </section>
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-black">
      <CreateGroupModal open={groupModalOpen} friends={friends} onClose={() => setGroupModalOpen(false)} onDone={refreshSidebar} />
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-12">
        {inboxPanel}
        {conversationPanel}
      </div>
    </div>
  );
}
