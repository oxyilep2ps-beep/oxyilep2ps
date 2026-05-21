'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { listAdminMessages, sendAdminMessage, type AdminMessageRow } from '@/app/actions/admin-messages';

export function AdminChatTab() {
  const [messages, setMessages] = useState<AdminMessageRow[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setMessages(await listAdminMessages());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('admin_messages_room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_messages' },
        (payload) => {
          const row = payload.new as AdminMessageRow;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await sendAdminMessage(text);
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-[60dvh] w-full min-w-0 flex-col">
      <div>
        <h2 className="text-xl font-black text-neutral-950 dark:text-white">Admin chat</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Secure room for Oxyile administrators only. Hidden from investors and borrowers.
        </p>
      </div>

      <div className="glass-card mt-4 flex flex-1 flex-col overflow-hidden rounded-2xl">
        <div className="max-h-[50dvh] flex-1 space-y-3 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-brand-500" size={24} />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-sm text-neutral-500">No messages yet. Say hello.</p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="rounded-2xl bg-brand-500/10 px-4 py-3">
                <p className="text-xs font-bold text-brand-700 dark:text-brand-300">{msg.sender_email}</p>
                <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">{msg.content}</p>
                <p className="mt-1 text-[10px] text-neutral-500">
                  {new Date(msg.created_at).toLocaleString('en-GB')}
                </p>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="flex gap-2 border-t border-white/20 p-3 dark:border-white/10">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message admins…"
            className="flex-1 rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none dark:border-white/10 dark:bg-black"
          />
          <button
            type="submit"
            disabled={sending}
            className="grid h-11 w-11 place-items-center rounded-full bg-brand-500 text-white disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
