'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Send, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  listAdminPeers,
  listDmMessages,
  listGroupMessages,
  sendDmMessage,
  sendGroupMessage,
  type AdminDmMessage,
  type AdminGroupMessage,
  type AdminPeer,
} from '@/app/actions/admin-social';
import { cn } from '@/lib/utils';

type CommsTab = 'group' | 'dm';

export function AdminCommsCenter() {
  const [tab, setTab] = useState<CommsTab>('group');
  const [peers, setPeers] = useState<AdminPeer[]>([]);
  const [activePeer, setActivePeer] = useState<AdminPeer | null>(null);
  const [dmMessages, setDmMessages] = useState<AdminDmMessage[]>([]);
  const [groupMessages, setGroupMessages] = useState<AdminGroupMessage[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadPeers = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) setMyId(user.id);
    setPeers(await listAdminPeers());
  }, []);

  const loadGroup = useCallback(async () => {
    setGroupMessages(await listGroupMessages());
  }, []);

  const loadDm = useCallback(
    async (peerId: string) => {
      setDmMessages(await listDmMessages(peerId));
    },
    []
  );

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await loadPeers();
      await loadGroup();
      setLoading(false);
    })();
  }, [loadPeers, loadGroup]);

  useEffect(() => {
    if (tab === 'dm' && activePeer) void loadDm(activePeer.id);
  }, [tab, activePeer, loadDm]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('admin_comms_phase4')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_group_messages' },
        () => void loadGroup()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_chats' },
        () => {
          if (activePeer) void loadDm(activePeer.id);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activePeer, loadGroup, loadDm]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dmMessages, groupMessages, tab]);

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      if (tab === 'group') {
        await sendGroupMessage(text);
        await loadGroup();
      } else if (activePeer) {
        await sendDmMessage(activePeer.id, text);
        await loadDm(activePeer.id);
      }
      setText('');
    } finally {
      setSending(false);
    }
  };

  const messages = tab === 'group' ? groupMessages : dmMessages;

  return (
    <div className="flex min-h-[65dvh] w-full min-w-0 flex-col gap-4 lg:flex-row">
      <div className="lg:w-72">
        <h2 className="text-xl font-black text-neutral-950 dark:text-white">Admin Comms</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Group room and direct messages — admins only.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setTab('group')}
            className={cn(
              'flex-1 rounded-full px-3 py-2 text-xs font-bold',
              tab === 'group' ? 'bg-brand-500 text-white' : 'glass-card'
            )}
          >
            Group Chat
          </button>
          <button
            type="button"
            onClick={() => setTab('dm')}
            className={cn(
              'flex-1 rounded-full px-3 py-2 text-xs font-bold',
              tab === 'dm' ? 'bg-brand-500 text-white' : 'glass-card'
            )}
          >
            Direct
          </button>
        </div>
        {tab === 'dm' && (
          <ul className="glass-card mt-3 max-h-[40dvh] space-y-1 overflow-y-auto rounded-2xl p-2 lg:max-h-none">
            {peers.length === 0 ? (
              <li className="p-3 text-center text-xs text-neutral-500">No other admins yet.</li>
            ) : (
              peers.map((peer) => (
                <li key={peer.id}>
                  <button
                    type="button"
                    onClick={() => setActivePeer(peer)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition',
                      activePeer?.id === peer.id
                        ? 'bg-brand-500/15 text-brand-700 dark:text-brand-200'
                        : 'hover:bg-white/40 dark:hover:bg-white/5'
                    )}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-700">
                      {peer.display_name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 truncate font-semibold">{peer.display_name}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <div className="glass-card flex min-h-[50dvh] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl">
        <header className="flex items-center gap-2 border-b border-white/30 px-4 py-3 dark:border-white/10">
          <Users size={18} className="text-brand-500" />
          <p className="text-sm font-bold">
            {tab === 'group' ? 'Global admin room' : activePeer ? activePeer.display_name : 'Select an admin'}
          </p>
        </header>

        <div className="flex-1 space-y-2 overflow-y-auto overflow-x-hidden p-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-brand-500" size={24} />
            </div>
          ) : tab === 'dm' && !activePeer ? (
            <p className="py-10 text-center text-sm text-neutral-500">Choose an admin to start a DM.</p>
          ) : messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-neutral-500">No messages yet.</p>
          ) : tab === 'group' ? (
            groupMessages.map((msg) => {
              const mine = msg.sender_id === myId;
              return (
                <div key={msg.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                      mine ? 'bg-brand-500 text-white' : 'bg-white/50 dark:bg-white/10'
                    )}
                  >
                    {!mine && (
                      <p className="text-[10px] font-bold text-brand-600 dark:text-brand-300">
                        {msg.sender_name}
                      </p>
                    )}
                    <p>{msg.content}</p>
                    <p className="mt-1 text-[10px] opacity-60">
                      {new Date(msg.created_at).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            dmMessages.map((msg) => {
              const mine = msg.sender_id === myId;
              return (
                <div key={msg.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                      mine ? 'bg-brand-500 text-white' : 'bg-white/50 dark:bg-white/10'
                    )}
                  >
                    <p>{msg.content}</p>
                    <p className="mt-1 text-[10px] opacity-60">
                      {new Date(msg.created_at).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={handleSend}
          className="flex gap-2 border-t border-white/30 p-3 dark:border-white/10"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={tab === 'dm' && !activePeer}
            placeholder={tab === 'group' ? 'Message all admins…' : 'Direct message…'}
            className="min-w-0 flex-1 rounded-full border border-white/40 bg-white/60 px-4 py-2.5 text-sm outline-none dark:border-white/10 dark:bg-white/10"
          />
          <button
            type="submit"
            disabled={sending || (tab === 'dm' && !activePeer)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-500 text-white disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
