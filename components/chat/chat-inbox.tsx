'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import type { ChatPeer, MemberRole, UserPresence } from '@/lib/chat/types';
import { displayHandle, oppositeRole } from '@/lib/chat/utils';
import { ChatAvatar } from '@/components/chat/chat-avatar';

export function ChatInbox() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [peers, setPeers] = useState<ChatPeer[]>([]);
  const [presenceMap, setPresenceMap] = useState<Record<string, UserPresence>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInbox() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setError('You must be signed in to view chats.');
        setLoading(false);
        return;
      }

      const { data: myProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError || !myProfile) {
        setError('Could not load your profile.');
        setLoading(false);
        return;
      }

      const myRole = myProfile.role as MemberRole;
      if (myRole !== 'INVESTOR' && myRole !== 'BORROWER') {
        setError('Chat is only available for investors and borrowers.');
        setLoading(false);
        return;
      }

      const { data: peerData, error: peersError } = await supabase
        .from('profiles')
        .select('id, role, full_legal_name, username, avatar_url')
        .eq('status', 'APPROVED')
        .eq('role', oppositeRole(myRole))
        .neq('role', 'ADMIN')
        .neq('id', user.id)
        .order('full_legal_name', { ascending: true })
        .limit(50);

      if (peersError) {
        setError(peersError.message);
        setLoading(false);
        return;
      }

      const list = (peerData ?? []) as ChatPeer[];
      setPeers(list);

      if (list.length > 0) {
        const ids = list.map((p) => p.id);
        const { data: presenceRows } = await supabase
          .from('user_presence')
          .select('user_id, status, last_seen')
          .in('user_id', ids);

        const map: Record<string, UserPresence> = {};
        for (const row of presenceRows ?? []) {
          map[row.user_id as string] = row as UserPresence;
        }
        setPresenceMap(map);
      }

      setLoading(false);
    }

    void loadInbox();
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel('inbox-presence')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, (payload) => {
        const row = (payload.new ?? payload.old) as UserPresence | undefined;
        if (!row?.user_id) return;
        setPresenceMap((current) => ({ ...current, [row.user_id]: row }));
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <section className="mx-auto max-w-lg px-4 py-6 sm:px-6 sm:py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <h1 className="text-2xl font-black text-neutral-950 dark:text-white">Chats</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Message approved investors and borrowers on Oxyile
        </p>
      </motion.div>

      {loading ? (
        <div className="glass-card mt-6 flex items-center justify-center rounded-2xl p-12">
          <Loader2 size={24} className="animate-spin text-brand-500" />
        </div>
      ) : error ? (
        <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      ) : peers.length === 0 ? (
        <div className="glass-card mt-6 rounded-2xl p-8 text-center">
          <MessageCircle className="mx-auto text-brand-500" size={36} />
          <p className="mt-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200">No conversations yet</p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            When opposite-role users are approved, they will appear here.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {peers.map((peer, index) => (
            <motion.li
              key={peer.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Link
                href={`/chats/${peer.id}`}
                className="glass-card group flex items-center gap-4 rounded-2xl border border-white/60 p-4 transition hover:border-brand-300 hover:shadow-glow dark:border-white/10"
              >
                <div className="relative shrink-0">
                  <ChatAvatar name={peer.full_legal_name} avatarUrl={peer.avatar_url} size="lg" />
                  {presenceMap[peer.id]?.status === 'online' && (
                    <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-neutral-900" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-neutral-950 dark:text-white">{peer.full_legal_name}</p>
                  <p className="truncate text-xs font-semibold text-brand-600 dark:text-brand-300">
                    {displayHandle(peer.username, peer.full_legal_name)}
                  </p>
                  <p className="mt-1 text-[10px] text-neutral-500">
                    {presenceMap[peer.id]?.status === 'online'
                      ? 'Online'
                      : presenceMap[peer.id]?.last_seen
                        ? `Last seen ${new Date(presenceMap[peer.id].last_seen).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                        : peer.role}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-glow transition group-hover:bg-brand-400">
                  Tap to Chat
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}
