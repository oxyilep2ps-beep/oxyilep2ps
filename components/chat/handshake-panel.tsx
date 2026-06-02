'use client';

import { FormEvent, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { HandshakeRow } from '@/lib/chat/types';
import { createClient } from '@/lib/supabase/client';
import { useEmergencyPause } from '@/lib/hooks/use-emergency-pause';

type HandshakePanelProps = {
  open: boolean;
  onClose: () => void;
  myId: string;
  myRole: 'INVESTOR' | 'BORROWER';
  peerId: string;
  handshakes: HandshakeRow[];
  onRefresh: () => void;
};

export function HandshakePanel({
  open,
  onClose,
  myId,
  myRole,
  peerId,
  handshakes,
  onRefresh,
}: HandshakePanelProps) {
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [duration, setDuration] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { paused: emergencyPause } = useEmergencyPause();

  if (!open) return null;

  const lenderId = myRole === 'INVESTOR' ? myId : peerId;
  const borrowerId = myRole === 'BORROWER' ? myId : peerId;

  const propose = async (event: FormEvent) => {
    event.preventDefault();
    if (emergencyPause) {
      setMessage('Platform is paused by admin. Handshake proposals are temporarily disabled.');
      return;
    }
    const amt = Number(amount);
    const rt = Number(rate);
    const dur = Number(duration);
    if (!amt || !rt || !dur) return;

    setBusy(true);
    setMessage(null);
    const supabase = createClient();

    const { error } = await supabase.from('handshakes').insert({
      lender_id: lenderId,
      borrower_id: borrowerId,
      amount: amt,
      rate: rt,
      duration: dur,
      status: 'PENDING',
    });

    if (error) {
      setMessage(error.message);
    } else {
      await supabase.from('messages').insert({
        sender_id: myId,
        receiver_id: peerId,
        content: `🤝 Handshake proposed: £${amt} at ${rt}% for ${dur} months.`,
      });
      setAmount('');
      setRate('');
      setDuration('');
      onRefresh();
    }
    setBusy(false);
  };

  const approve = async (handshake: HandshakeRow) => {
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const patch: Record<string, string> = {};
    const now = new Date().toISOString();

    if (myId === handshake.lender_id && !handshake.lender_approved_at) patch.lender_approved_at = now;
    if (myId === handshake.borrower_id && !handshake.borrower_approved_at) patch.borrower_approved_at = now;

    const { error } = await supabase.from('handshakes').update(patch).eq('id', handshake.id);
    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }

    const lenderOk = Boolean(patch.lender_approved_at || handshake.lender_approved_at);
    const borrowerOk = Boolean(patch.borrower_approved_at || handshake.borrower_approved_at);

    if (lenderOk && borrowerOk) {
      const res = await fetch(`/api/handshakes/${handshake.id}/execute`, { method: 'POST' });
      const body = (await res.json()) as { ok?: boolean; error?: string; polygonTxHash?: string; sandbox?: boolean };
      if (!res.ok || !body.ok) {
        setMessage(body.error ?? 'On-chain execution failed');
      } else {
        setMessage(
          body.sandbox
            ? `Sandbox handshake recorded. Tx: ${body.polygonTxHash}`
            : `Active on Polygon Amoy. Tx: ${body.polygonTxHash}`
        );
      }
    }

    onRefresh();
    setBusy(false);
  };

  const setupGoCardlessMandate = async (_handshake: HandshakeRow) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/payments/setup-mandate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrowerId, lenderId }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        authorisation_url?: string;
        error?: string;
        stub?: boolean;
      };
      if (!res.ok || !body.ok || !body.authorisation_url) {
        setMessage(body.error ?? 'Could not start GoCardless flow');
        setBusy(false);
        return;
      }
      if (body.stub) {
        setMessage('Sandbox: redirecting to test mandate URL…');
      }
      window.location.href = body.authorisation_url;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Mandate setup failed');
      setBusy(false);
    }
  };

  return (
    <div className="glass-card mx-4 mb-2 rounded-2xl border border-brand-200/60 p-4 dark:border-brand-500/20">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-brand-600 dark:text-brand-300">Handshake</p>
        <button type="button" onClick={onClose} aria-label="Close handshake panel">
          <X size={18} />
        </button>
      </div>

      <form onSubmit={propose} className="mt-3 grid gap-2 sm:grid-cols-3">
        <input
          required
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (£)"
          className="rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-black/40"
        />
        <input
          required
          type="number"
          step="0.1"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="Rate (%)"
          className="rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-black/40"
        />
        <input
          required
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="Months"
          className="rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-black/40"
        />
        <button
          type="submit"
          disabled={busy || emergencyPause}
          className="rounded-full bg-brand-500 py-2 text-xs font-semibold text-white disabled:opacity-50 sm:col-span-3"
        >
          {emergencyPause ? 'Platform Paused' : 'Initiate Handshake'}
        </button>
        {emergencyPause && (
          <p className="sm:col-span-3 text-center text-[10px] font-semibold text-red-600">
            Emergency pause active — handshake proposals disabled
          </p>
        )}
      </form>

      <ul className="mt-3 space-y-2">
        {handshakes.map((h) => {
          const approvedByMe =
            (myId === h.lender_id && Boolean(h.lender_approved_at)) ||
            (myId === h.borrower_id && Boolean(h.borrower_approved_at));
          return (
            <li key={h.id} className="rounded-xl bg-brand-500/5 p-3 text-xs">
              <p className="font-semibold">
                £{h.amount} · {h.rate}% · {h.duration}mo — {h.status}
              </p>
              {h.polygon_tx_hash ? <p className="mt-1 break-all text-neutral-500">Tx: {h.polygon_tx_hash}</p> : null}
              {h.status === 'PENDING' && (
                <button
                  type="button"
                  disabled={busy || approvedByMe}
                  onClick={() => approve(h)}
                  className="mt-2 rounded-full bg-neutral-900 px-3 py-1 text-[10px] font-bold text-white disabled:opacity-50 dark:bg-white dark:text-black"
                >
                  {approvedByMe ? 'Approved' : 'Approve'}
                </button>
              )}
              {h.status === 'ACTIVE' && myRole === 'BORROWER' && myId === borrowerId && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setupGoCardlessMandate(h)}
                  className="mt-2 rounded-full bg-brand-500 px-3 py-1 text-[10px] font-bold text-white"
                >
                  Set up GoCardless mandate
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {message && <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">{message}</p>}
      {busy && <Loader2 size={16} className="mt-2 animate-spin text-brand-500" />}
    </div>
  );
}
