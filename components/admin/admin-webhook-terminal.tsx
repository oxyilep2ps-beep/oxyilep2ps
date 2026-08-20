'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Terminal, X } from 'lucide-react';
import { runTerminalCommand } from '@/app/actions/admin-terminal';
import { formatTerminalHelp } from '@/lib/admin/terminal-commands';

function stamp() {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

function prefixed(text: string) {
  return `[${stamp()}] ${text}`;
}

const WELCOME = [
  prefixed('Admin terminal ready. Type /help and press Enter.'),
];

export function AdminWebhookTerminal() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<string[]>(WELCOME);
  const [command, setCommand] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

    if (cmd === '/help') {
      setLines((prev) => [...prev, ...formatTerminalHelp().map((l) => prefixed(l))]);
      return;
    }

    setBusy(true);
    try {
      const result = await runTerminalCommand(raw);
      setLines((prev) => [
        ...prev.slice(-200),
        ...result.lines.map((line) => prefixed(line)),
      ]);
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
      {/* FAB — always visible bottom-left on all screen sizes */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 left-4 z-[9999] inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-black px-3 py-2.5 text-xs font-semibold text-emerald-300 shadow-2xl transition hover:border-[#F97316]/50 hover:text-[#F97316] sm:bottom-28 lg:left-[17rem]"
        aria-label="Open admin terminal"
      >
        <Terminal size={15} className="shrink-0 text-emerald-400" />
        <span className="hidden sm:inline">Terminal</span>
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
              aria-label="Close terminal overlay"
              className="fixed inset-0 z-[55] bg-black/55 backdrop-blur-[2px]"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-lg flex-col border-l border-emerald-500/20 bg-[#0a0a0a] shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="Admin terminal"
            >
              {/* Header */}
              <div className="flex shrink-0 items-center gap-2 border-b border-emerald-500/20 px-4 py-3">
                <Terminal size={15} className="text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Admin Terminal
                </span>
                <span className="ml-1 h-2 w-2 animate-pulse rounded-full bg-[#F97316]" />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="ml-auto grid h-8 w-8 place-items-center rounded-full border border-emerald-500/30 text-emerald-300 transition hover:bg-emerald-500/10"
                  aria-label="Close terminal"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Output */}
              <div
                ref={scrollRef}
                className="min-h-0 flex-1 overflow-y-auto px-4 py-3 font-mono text-[11px] leading-5 text-emerald-300/90"
              >
                {lines.map((line, i) => (
                  <p key={i} className="break-all whitespace-pre-wrap">
                    <span className="text-emerald-600">&gt;</span> {line}
                  </p>
                ))}
                {busy && (
                  <p className="text-emerald-600 animate-pulse">Running…</p>
                )}
              </div>

              {/* Input */}
              <form
                onSubmit={(e) => void onSubmit(e)}
                className="flex shrink-0 items-center gap-2 border-t border-emerald-500/20 bg-black/40 px-4 py-3"
              >
                <span className="shrink-0 font-mono text-sm text-[#F97316]">$</span>
                <input
                  ref={inputRef}
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  disabled={busy}
                  placeholder="Type /help and press Enter…"
                  className="min-w-0 flex-1 bg-transparent font-mono text-sm text-emerald-200 outline-none placeholder:text-emerald-800 disabled:opacity-50"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Terminal command input"
                />
              </form>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
