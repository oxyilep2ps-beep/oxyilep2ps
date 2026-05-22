'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Bot, MessageCircle, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseOliverReply } from '@/lib/oliver/parser';
import { cn } from '@/lib/utils';

type BotMessage = { id: string; role: 'user' | 'bot'; text: string };

export function OliverBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<BotMessage[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: "Hi! I'm Oliver — your Oxyile assistant. Ask about KYC, handshakes, EMI, or platform rules.",
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = (event?: FormEvent) => {
    event?.preventDefault();
    const text = input.trim();
    if (!text) return;

    const userMsg: BotMessage = { id: `u-${Date.now()}`, role: 'user', text };
    const reply: BotMessage = {
      id: `b-${Date.now()}`,
      role: 'bot',
      text: parseOliverReply(text),
    };

    setMessages((m) => [...m, userMsg, reply]);
    setInput('');
  };

  const toggleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen((v) => !v);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[120]" aria-hidden={!open}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            className="pointer-events-auto fixed bottom-[calc(5.5rem+4.5rem+env(safe-area-inset-bottom))] right-4 z-[121] flex h-[min(420px,65dvh)] w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/90"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center gap-3 border-b border-white/40 bg-brand-500/10 px-4 py-3 dark:border-white/10">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-orange-400 text-white shadow-glow">
                <Bot size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-neutral-950 dark:text-white">Oliver</p>
                <p className="text-xs text-neutral-500">Oxyile Support Bot</p>
              </div>
              <button
                type="button"
                onClick={toggleOpen}
                aria-label="Close Oliver"
                className="rounded-full p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                      m.role === 'user'
                        ? 'bg-brand-500 text-white'
                        : 'glass-card border border-white/50 text-neutral-800 dark:text-neutral-200'
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            <form
              onSubmit={send}
              className="pointer-events-auto flex gap-2 border-t border-white/40 px-3 py-3 dark:border-white/10"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Oliver…"
                className="min-w-0 flex-1 rounded-full border border-white/50 bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-white/10 dark:bg-white/10"
              />
              <button
                type="submit"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-500 text-white"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={toggleOpen}
        aria-label={open ? 'Close Oliver support bot' : 'Open Oliver support bot'}
        aria-expanded={open}
        className="pointer-events-auto fixed bottom-[calc(5.5rem+1rem+env(safe-area-inset-bottom))] right-4 z-[122] grid h-14 w-14 place-items-center rounded-full bg-brand-500 text-white shadow-glow transition hover:bg-brand-400"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}
