'use client';

import { FormEvent, useEffect, useMemo, useState, useTransition } from 'react';
import { Loader2, MessageCircle, Plus, Search, Send, Users, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { listMyConnections } from '@/app/actions/connections';
import { createChatGroup, listGroupMessages, listMyChatGroups, type GroupMessage } from '@/app/actions/social-network';
import { ChatAvatar } from '@/components/chat/chat-avatar';
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
  const supabase = createClient();
  const [myId, setMyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [active, setActive] = useState<ActiveChat | null>(null);
  const [messages, setMessages] = useState<(DirectMessage | GroupMessage)[]>([]);
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  const filteredFriends = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => f.full_legal_name.toLowerCase().includes(q));
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
      await refreshSidebar();
      setLoading(false);
    }
    void init();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!initialPeerId || friends.length === 0) return;
    const peer = friends.find((f) => f.userId === initialPeerId);
    if (peer) {
      setActive({ kind: 'friend', id: peer.userId, name: peer.full_legal_name, avatar: peer.avatar_url, role: peer.role });
    }
  }, [initialPeerId, friends]);

  useEffect(() => {
    if (!active || !myId) return;
    const current = active;
    let cancelled = false;

    async function loadMessages() {
      if (current.kind === 'friend') {
        const { data } = await supabase
          .from('messages')
          .select('id, sender_id, content, created_at')
          .or(`and(sender_id.eq.${myId},receiver_id.eq.${current.id}),and(sender_id.eq.${current.id},receiver_id.eq.${myId})`)
          .order('created_at', { ascending: true })
          .limit(200);
        if (!cancelled) {
          setMessages(((data ?? []) as DirectMessage[]).map((m) => ({ ...m })));
        }
      } else {
        const rows = await listGroupMessages(current.id, 200);
        if (!cancelled) setMessages(rows);
      }
    }

    void loadMessages();

    const channel = supabase
      .channel(`premium-chat-${current.kind}-${current.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: current.kind === 'friend' ? 'messages' : 'chat_group_messages' },
        () => void loadMessages()
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [active, myId, supabase]);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!active || !myId || !text.trim()) return;
    const content = text.trim();
    setText('');
    if (active.kind === 'friend') {
      await supabase.from('messages').insert({ sender_id: myId, receiver_id: active.id, content });
      return;
    }
    await supabase.from('chat_group_messages').insert({ group_id: active.id, sender_id: myId, content });
  };

  return (
    <div className="h-[calc(100dvh-3.5rem)] overflow-hidden rounded-2xl border border-neutral-800 bg-black">
      <CreateGroupModal open={groupModalOpen} friends={friends} onClose={() => setGroupModalOpen(false)} onDone={refreshSidebar} />
      <div className="grid h-full grid-cols-1 md:grid-cols-[340px_1fr]">
        <aside className="border-r border-neutral-800 bg-[#111]">
          <div className="border-b border-neutral-800 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h1 className="text-sm font-black uppercase tracking-[0.2em] text-white">Inbox</h1>
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
                className="h-9 w-full rounded-xl border border-neutral-700 bg-black pl-8 pr-3 text-sm text-white outline-none focus:border-[#F97316]/60"
              />
            </div>
          </div>

          <div className="h-[calc(100%-4.8rem)] overflow-y-auto">
            <p className="px-3 pt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Friends</p>
            {filteredFriends.map((f) => (
              <button
                key={f.userId}
                type="button"
                onClick={() => setActive({ kind: 'friend', id: f.userId, name: f.full_legal_name, avatar: f.avatar_url, role: f.role })}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left transition',
                  active?.kind === 'friend' && active.id === f.userId ? 'bg-[#F97316]/12' : 'hover:bg-white/5'
                )}
              >
                <ChatAvatar name={f.full_legal_name} avatarUrl={f.avatar_url} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{f.full_legal_name}</p>
                  <p className="text-[11px] text-neutral-400">{f.role}</p>
                </div>
              </button>
            ))}

            <p className="px-3 pt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Groups</p>
            {filteredGroups.map((g) => (
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
                  <p className="truncate text-sm font-semibold text-white">{g.name}</p>
                  <p className="text-[11px] text-neutral-400">{g.members_count} members</p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex h-full flex-col bg-[#0a0a0a]">
          {loading ? (
            <div className="grid flex-1 place-items-center">
              <Loader2 size={20} className="animate-spin text-[#F97316]" />
            </div>
          ) : !active ? (
            <div className="grid flex-1 place-items-center px-6 text-center">
              <div>
                <MessageCircle size={30} className="mx-auto mb-3 text-[#F97316]" />
                <p className="text-sm font-semibold text-white">Choose a friend or group to start chatting.</p>
              </div>
            </div>
          ) : (
            <>
              <header className="flex h-14 items-center gap-3 border-b border-neutral-800 px-4">
                {active.kind === 'friend' ? (
                  <ChatAvatar name={active.name} avatarUrl={active.avatar} size="sm" />
                ) : (
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[#F97316]/20 text-[#F97316]">
                    <Users size={14} />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{active.name}</p>
                  <p className="text-[11px] text-neutral-400">{active.kind === 'friend' ? active.role : 'Group chat'}</p>
                </div>
              </header>

              <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
                {messages.length === 0 ? (
                  <div className="grid h-full place-items-center text-sm text-neutral-500">No messages yet.</div>
                ) : (
                  messages.map((m) => {
                    const mine = m.sender_id === myId;
                    return (
                      <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                        <div className={cn('max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm', mine ? 'bg-[#F97316] text-white' : 'bg-neutral-800 text-neutral-100')}>
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
              </div>

              <form onSubmit={sendMessage} className="border-t border-neutral-800 p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a message..."
                    className="h-10 min-w-0 flex-1 rounded-full border border-neutral-700 bg-[#111] px-4 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-[#F97316]/60"
                  />
                  <button type="submit" className="grid h-10 w-10 place-items-center rounded-full bg-[#F97316] text-white">
                    <Send size={16} />
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
