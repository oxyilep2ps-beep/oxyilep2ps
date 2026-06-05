'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Terminal, X } from 'lucide-react';

const MOCK_EVENTS = [
  '[GoCardless] Mandate MD001 activated — borrower 8f2a…',
  '[Polygon Amoy] TX 0x9c4e… confirmed — handshake mint',
  '[GoCardless] Subscription SUB-442 payment settled',
  '[Polygon Amoy] Gas spike detected — 42 gwei',
  '[Webhook] payment.confirmed — handshake #TXN-0192',
  '[GoCardless] Mandate MD008 pending authorisation',
  '[Polygon Amoy] TX 0x1ab3… submitted — contract seal',
  '[Webhook] mandate.cancelled — user review required',
];

export function AdminWebhookTerminal() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<string[]>(MOCK_EVENTS.slice(0, 4));
  const scrollRef = useRef<HTMLDivElement>(null);

  const pushLine = useCallback(() => {
    const next = MOCK_EVENTS[Math.floor(Math.random() * MOCK_EVENTS.length)];
    const stamp = new Date().toLocaleTimeString('en-GB', { hour12: false });
    setLines((prev) => [...prev.slice(-40), `[${stamp}] ${next}`]);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(pushLine, 4200);
    return () => window.clearInterval(interval);
  }, [pushLine]);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [lines, open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-40 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-neutral-950 px-4 py-3 text-xs font-semibold text-emerald-300 shadow-2xl transition hover:border-emerald-400 hover:bg-neutral-900"
        aria-label="View live webhook terminal"
      >
        <Terminal size={16} className="text-emerald-400" />
        <span className="hidden sm:inline">View Terminal</span>
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              aria-label="Close terminal overlay"
              className="fixed inset-0 z-[55] bg-black/55 backdrop-blur-[2px]"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-lg flex-col border-l border-emerald-500/25 bg-neutral-950 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="Live webhook terminal"
            >
              <div className="flex items-center gap-2 border-b border-emerald-500/20 px-4 py-3">
                <Terminal size={16} className="text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Live Webhook Terminal
                </span>
                <span className="ml-2 h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="ml-auto grid h-9 w-9 place-items-center rounded-full border border-emerald-500/30 text-emerald-300 transition hover:bg-emerald-500/10"
                  aria-label="Close terminal"
                >
                  <X size={18} />
                </button>
              </div>
              <div
                ref={scrollRef}
                className="min-h-0 flex-1 overflow-y-auto px-4 py-3 font-mono text-xs leading-6 text-emerald-300/90"
              >
                {lines.map((line, i) => (
                  <p key={`${line}-${i}`} className="break-all">
                    <span className="text-emerald-500/70">&gt;</span> {line}
                  </p>
                ))}
              </div>
              <div className="border-t border-emerald-500/20 px-4 py-3 text-[11px] text-emerald-500/70">
                Streaming mock GoCardless & Polygon webhook events. Press Esc to close.
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
