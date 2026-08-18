'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Terminal, X } from 'lucide-react';
import { runTerminalCommand } from '@/app/actions/admin-terminal';
import { formatTerminalHelp } from '@/lib/admin/terminal-commands';

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

function stamp() {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

function prefixed(text: string) {
  return `[${stamp()}] ${text}`;
}

export function AdminWebhookTerminal() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<string[]>(() =>
    MOCK_EVENTS.slice(0, 4).map((event) => prefixed(event))
  );
  const [command, setCommand] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pushLine = useCallback(() => {
    const next = MOCK_EVENTS[Math.floor(Math.random() * MOCK_EVENTS.length)];
    setLines((prev) => [...prev.slice(-80), prefixed(next)]);
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
    inputRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const raw = command.trim();
    if (!raw || busy) return;

    setCommand('');
    setLines((prev) => [...prev, `$ ${raw}`]);

    const cmd = raw.split(/\s+/)[0]?.toLowerCase();
    if (cmd === '/clear') {
      setLines([prefixed('Terminal history cleared.')]);
      return;
    }

    setBusy(true);
    try {
      const result =
        cmd === '/help'
          ? { lines: formatTerminalHelp() }
          : await runTerminalCommand(raw);
      setLines((prev) => [...prev.slice(-80), ...result.lines.map((line) => prefixed(line))]);
    } catch (error) {
      setLines((prev) => [
        ...prev,
        prefixed(error instanceof Error ? error.message : 'Command failed'),
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-4 z-40 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-black px-4 py-3 text-xs font-semibold text-emerald-300 shadow-2xl transition hover:border-[#F97316]/50 hover:text-[#F97316] md:bottom-[calc(1.25rem+env(safe-area-inset-bottom))]"
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
              className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-lg flex-col border-l border-emerald-500/25 bg-black shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="Live webhook terminal"
            >
              <div className="flex items-center gap-2 border-b border-emerald-500/20 px-4 py-3">
                <Terminal size={16} className="text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Live Webhook Terminal
                </span>
                <span className="ml-2 h-2 w-2 animate-pulse rounded-full bg-[#F97316]" />
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
              <form
                onSubmit={(event) => void onSubmit(event)}
                className="flex items-center gap-2 border-t border-emerald-500/20 px-4 py-3"
              >
                <span className="text-green-500">$</span>
                <input
                  ref={inputRef}
                  value={command}
                  onChange={(event) => setCommand(event.target.value)}
                  disabled={busy}
                  placeholder="Type /help and press Enter"
                  className="min-w-0 flex-1 bg-transparent font-mono text-sm text-emerald-200 outline-none placeholder:text-emerald-700"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Terminal command"
                />
              </form>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
