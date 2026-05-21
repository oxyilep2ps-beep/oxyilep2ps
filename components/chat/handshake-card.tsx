'use client';

import { useState } from 'react';
import { ExternalLink, FileSignature, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatContractLabel } from '@/lib/handshake/calculations';
import type { HandshakeRow } from '@/lib/chat/types';
import { cn } from '@/lib/utils';

type HandshakeCardProps = {
  handshake: HandshakeRow;
  myId: string;
  onUpdated: () => void;
};

function polygonUrl(hash: string | null): string | null {
  if (!hash || hash.startsWith('sandbox_')) return null;
  return `https://amoy.polygonscan.com/tx/${hash}`;
}

export function HandshakeCard({ handshake, myId, onUpdated }: HandshakeCardProps) {
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState(handshake);

  const approvedByMe =
    (myId === local.lender_id && Boolean(local.lender_approved_at)) ||
    (myId === local.borrower_id && Boolean(local.borrower_approved_at));

  const bothApproved = Boolean(local.lender_approved_at && local.borrower_approved_at);
  const label = formatContractLabel(local.status, local.payment_status);
  const txLink = polygonUrl(local.polygon_tx_hash);

  const approve = async () => {
    setBusy(true);
    const supabase = createClient();
    const patch: Record<string, string> = {};
    const now = new Date().toISOString();

    if (myId === local.lender_id && !local.lender_approved_at) patch.lender_approved_at = now;
    if (myId === local.borrower_id && !local.borrower_approved_at) patch.borrower_approved_at = now;

    const { error } = await supabase.from('handshakes').update(patch).eq('id', local.id);
    if (error) {
      setBusy(false);
      return;
    }

    const next = {
      ...local,
      lender_approved_at: patch.lender_approved_at ?? local.lender_approved_at,
      borrower_approved_at: patch.borrower_approved_at ?? local.borrower_approved_at,
    };
    setLocal(next);

    const lenderOk = Boolean(next.lender_approved_at);
    const borrowerOk = Boolean(next.borrower_approved_at);

    if (lenderOk && borrowerOk) {
      const res = await fetch(`/api/handshakes/${local.id}/execute`, { method: 'POST' });
      const body = (await res.json()) as { ok?: boolean; polygonTxHash?: string };
      if (body.ok) {
        setLocal({
          ...next,
          status: 'ACTIVE',
          payment_status: 'PENDING',
          polygon_tx_hash: body.polygonTxHash ?? next.polygon_tx_hash,
        });
      }
    }

    onUpdated();
    setBusy(false);
  };

  return (
    <article className="w-full max-w-[300px] overflow-hidden rounded-2xl border-2 border-brand-400/60 bg-gradient-to-br from-brand-500/15 via-white/90 to-orange-100/40 shadow-glow dark:from-brand-500/20 dark:via-black/60 dark:to-neutral-900/80">
      <div className="flex items-center gap-2 border-b border-brand-300/40 bg-brand-500/20 px-4 py-2.5 dark:border-brand-500/30">
        <FileSignature size={18} className="text-brand-600 dark:text-brand-300" />
        <p className="text-xs font-black uppercase tracking-wider text-brand-700 dark:text-brand-200">
          Handshake Proposal
        </p>
      </div>

      <div className="space-y-2 px-4 py-3 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-neutral-500">Loan amount</span>
          <span className="font-bold text-neutral-950 dark:text-white">
            £{Number(local.amount).toLocaleString('en-GB')}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-neutral-500">Interest</span>
          <span className="font-semibold">{local.rate}% p.a.</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-neutral-500">Duration</span>
          <span className="font-semibold">{local.duration} months</span>
        </div>
        <div className="flex justify-between gap-2 border-t border-brand-200/50 pt-2 dark:border-white/10">
          <span className="text-neutral-500">EMI (est.)</span>
          <span className="font-bold text-brand-600 dark:text-brand-300">
            £{Number(local.emi_amount ?? 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-neutral-500">Total return</span>
          <span className="font-bold">
            £{Number(local.total_return ?? 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div
        className={cn(
          'px-4 py-2 text-center text-xs font-bold uppercase tracking-wide',
          local.status === 'ACTIVE' && local.payment_status === 'PAID'
            ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
            : local.status === 'ACTIVE'
              ? 'bg-amber-500/20 text-amber-900 dark:text-amber-200'
              : 'bg-neutral-200/80 text-neutral-700 dark:bg-white/10 dark:text-neutral-300'
        )}
      >
        {label}
      </div>

      {local.status === 'PENDING' && !bothApproved && (
        <div className="border-t border-brand-200/40 p-3 dark:border-white/10">
          <button
            type="button"
            disabled={busy || approvedByMe}
            onClick={approve}
            className="w-full rounded-full bg-brand-500 py-2.5 text-xs font-bold text-white shadow-glow hover:bg-brand-400 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="mx-auto animate-spin" size={16} />
            ) : approvedByMe ? (
              'You approved'
            ) : (
              'Approve handshake'
            )}
          </button>
        </div>
      )}

      {txLink && (
        <a
          href={txLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 border-t border-white/30 py-2 text-[10px] font-semibold text-brand-600 dark:text-brand-300"
        >
          View on Polygon Amoy <ExternalLink size={12} />
        </a>
      )}
    </article>
  );
}
