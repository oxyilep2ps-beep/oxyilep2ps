'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal } from 'lucide-react';

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
  const [lines, setLines] = useState<string[]>(MOCK_EVENTS.slice(0, 4));
  const scrollRef = useRef<HTMLDivElement>(null);

  const pushLine = useCallback(() => {
    const next = MOCK_EVENTS[Math.floor(Math.random() * MOCK_EVENTS.length)];
    const stamp = new Date().toLocaleTimeString('en-GB', { hour12: false });
    setLines((prev) => [...prev.slice(-14), `[${stamp}] ${next}`]);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(pushLine, 4200);
    return () => window.clearInterval(interval);
  }, [pushLine]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [lines]);

  return (
    <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-3 right-3 z-40 mx-auto hidden max-w-7xl md:block">
      <div className="overflow-hidden rounded-xl border border-emerald-500/30 bg-neutral-950 shadow-2xl">
        <div className="flex items-center gap-2 border-b border-emerald-500/20 px-3 py-1.5">
          <Terminal size={14} className="text-emerald-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Live Webhook Terminal</span>
          <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        </div>
        <div ref={scrollRef} className="max-h-24 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-5 text-emerald-300/90">
          {lines.map((line, i) => (
            <p key={`${line}-${i}`} className="truncate">
              <span className="text-emerald-500/70">&gt;</span> {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
