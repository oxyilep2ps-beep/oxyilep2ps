'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bot, MessageCircle, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseOliverReply } from '@/lib/oliver/parser';
import { supportMailto } from '@/lib/social-links';
import { cn } from '@/lib/utils';

type BotMessage = { id: string; role: 'user' | 'bot'; text: string };

const OPEN_EVENT = 'oxyile:open-oliver';

function OliverMessageText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (match) {
          return (
            <Link key={i} href={match[2]} className="font-semibold text-brand-600 underline">
              {match[1]}
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function OliverBot() {
  const pathname = usePathname();
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<BotMessage[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: "Hi! I'm Oliver — your Oxyile assistant. Ask about KYC, handshakes, EMI, or platform rules.",
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  const hasBottomNav =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/chats') ||
    pathname.startsWith('/admin-dashboard');

  const panelBottom = hasBottomNav
    ? 'bottom-[calc(5.5rem+4.5rem+env(safe-area-inset-bottom))]'
    : 'bottom-[calc(5rem+env(safe-area-inset-bottom))]';

  const fabBottom = hasBottomNav
    ? 'bottom-[calc(5.5rem+1rem+env(safe-area-inset-bottom))]'
    : 'bottom-[calc(1.25rem+env(safe-area-inset-bottom))]';

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatExpanded]);

  const openWidget = useCallback(() => {
    setIsWidgetOpen(true);
  }, []);

  useEffect(() => {
    const onOpen = () => {
      setIsWidgetOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const closeAll = () => {
    setIsChatExpanded(false);
    setIsWidgetOpen(false);
  };

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = input.trim();
    if (!text) return;

    const userMsg: BotMessage = { id: `u-${Date.now()}`, role: 'user', text };
    setMessages((m) => [...m, userMsg]);
    setInput('');

    const replyText = await parseOliverReply(text);
    const reply: BotMessage = {
      id: `b-${Date.now()}`,
      role: 'bot',
      text: replyText,
    };
    setMessages((m) => [...m, reply]);
  };

  const handleFabClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isWidgetOpen) {
      closeAll();
    } else {
      setIsWidgetOpen(true);
      setIsChatExpanded(false);
    }
  };

  const openChat = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsChatExpanded(true);
  };

  const closeChat = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsChatExpanded(false);
  };

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9999]"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        {isWidgetOpen && (
          <motion.div
            key={isChatExpanded ? 'chat' : 'preview'}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'pointer-events-auto fixed right-4 z-[10000] w-[min(360px,calc(100vw-2rem))]',
              panelBottom
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {isChatExpanded ? (
              <div className="flex h-[min(420px,65dvh)] flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/95">
                <header className="flex shrink-0 items-center gap-3 border-b border-white/40 bg-brand-500/10 px-4 py-3 dark:border-white/10">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-orange-400 text-white shadow-glow">
                    <Bot size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-neutral-950 dark:text-white">Oliver</p>
                    <p className="text-xs text-neutral-500">Oxyile Support Bot</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeChat}
                    aria-label="Close chat"
                    className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10"
                  >
                    <X size={18} />
                  </button>
                </header>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
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
                        <OliverMessageText text={m.text} />
                      </div>
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>

                <form
                  onSubmit={send}
                  className="flex shrink-0 gap-2 border-t border-white/40 px-3 py-3 dark:border-white/10"
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
              </div>
            ) : (
              <div className="rounded-2xl border border-white/60 bg-white/95 p-4 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/95">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-orange-400 text-white">
                      <Bot size={22} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neutral-950 dark:text-white">
                        Oliver — Oxyile Support
                      </p>
                      <p className="text-xs text-neutral-500">KYC, handshakes & platform help</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      closeAll();
                    }}
                    aria-label="Close"
                    className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10"
                  >
                    <X size={18} />
                  </button>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                  Hi — I can help with KYC, onboarding, and loan matching. Start a chat or reach our team.
                </p>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={openChat}
                    className="flex-1 rounded-full border border-brand-300 bg-brand-500/10 px-3 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-500/20 dark:border-brand-500/30 dark:text-brand-200"
                  >
                    Chat
                  </button>
                  <Link
                    href="/contact"
                    onClick={closeAll}
                    className="rounded-full bg-brand-500 px-3 py-2.5 text-sm font-semibold text-white shadow-glow hover:bg-brand-400"
                  >
                    Contact
                  </Link>
                </div>
                <a
                  href={supportMailto}
                  className="mt-2 block text-center text-xs font-medium text-neutral-500 hover:text-brand-600"
                >
                  Email support
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={handleFabClick}
        aria-label={isWidgetOpen ? 'Close Oliver' : 'Open Oliver support'}
        aria-expanded={isWidgetOpen}
        className={cn(
          'pointer-events-auto fixed right-4 z-[10001] grid h-14 w-14 place-items-center rounded-full bg-brand-500 text-white shadow-glow transition hover:bg-brand-400',
          fabBottom
        )}
      >
        {isWidgetOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}

/** Call from footer "Need Help?" or other CTAs */
export function openOliverWidget() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(OPEN_EVENT));
  }
}
