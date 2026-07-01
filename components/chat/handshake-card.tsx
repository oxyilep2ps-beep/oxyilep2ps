'use client';

import { useEffect, useState } from 'react';
import {
  Download,
  ExternalLink,
  FileSignature,
  Landmark,
  Loader2,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { initiateJITFunding } from '@/app/actions/payment';
import { createClient } from '@/lib/supabase/client';
import { normalizeHandshakeRow } from '@/lib/chat/handshake-realtime';
import { getHandshakeUiPhase, hasValidPolygonTx } from '@/lib/handshake/ui-state';
import type { ChatPeer, HandshakeRow, MemberRole } from '@/lib/chat/types';
import { generateContractPDF } from '@/lib/pdf/contract-pdf';
import { stashPendingHandshakeId } from '@/lib/payments/pending-handshake';
import { polygonscanTxUrl } from '@/lib/web3/polygonscan';
import { cn } from '@/lib/utils';

type HandshakeCardProps = {
  handshake: HandshakeRow;
  myId: string;
  myRole: MemberRole;
  peer: ChatPeer;
  onUpdated: () => void;
};

const primaryBtnClass =
  'group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-600 via-brand-500 to-orange-500 py-3 text-xs font-black uppercase tracking-wide text-white shadow-glow transition hover:scale-[1.02] hover:brightness-110 disabled:scale-100 disabled:opacity-50';

const mutedBtnClass =
  'inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full border border-neutral-200/80 bg-neutral-100/90 py-3 text-xs font-bold text-neutral-500 dark:border-white/10 dark:bg-white/5 dark:text-neutral-400';

export function HandshakeCard({ handshake, myId, myRole, peer, onUpdated }: HandshakeCardProps) {
  const [busy, setBusy] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [local, setLocal] = useState(handshake);

  useEffect(() => {
    setLocal(handshake);
  }, [handshake]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`handshake-updates-${handshake.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'handshakes',
          filter: `id=eq.${handshake.id}`,
        },
        (payload) => {
          setLocal((prev) =>
            normalizeHandshakeRow(payload.new as Record<string, unknown>, prev)
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [handshake.id]);

  const isInvestor = myId === local.lender_id && myRole === 'INVESTOR';
  const isBorrower = myId === local.borrower_id && myRole === 'BORROWER';
  const phase = getHandshakeUiPhase(local);
  const txLink = hasValidPolygonTx(local) ? polygonscanTxUrl(local.polygon_tx_hash!) : null;
  const contractReady = phase === 'ACTIVE' && Boolean(txLink);

  const acceptLoanTerms = async () => {
    if (!isBorrower || local.borrower_approved_at) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from('handshakes')
      .update({ borrower_approved_at: new Date().toISOString() })
      .eq('id', local.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      onUpdated();
    }
    setBusy(false);
  };

  const fundEscrowAndAccept = async () => {
    setIsRedirecting(true);
    setError(null);

    try {
      const result = await initiateJITFunding(local.id, Number(local.amount));
      if (!result.success) {
        setError(result.error);
        setIsRedirecting(false);
        return;
      }
      stashPendingHandshakeId(local.id);
      window.location.href = result.checkout_url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start investor checkout');
      setIsRedirecting(false);
    }
  };

  const linkBankAndStartEmi = async () => {
    setIsRedirecting(true);
    setError(null);

    try {
      const res = await fetch('/api/payments/setup-mandate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrowerId: local.borrower_id,
          lenderId: local.lender_id,
          handshakeId: local.id,
        }),
      });
      const body = (await res.json()) as { authorisation_url?: string; error?: string };

      if (!res.ok || !body.authorisation_url) {
        throw new Error(body.error ?? 'Could not start GoCardless mandate flow');
      }

      stashPendingHandshakeId(local.id);
      window.location.href = body.authorisation_url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not link bank account');
      setIsRedirecting(false);
    }
  };

  const downloadContract = () => {
    generateContractPDF({
      perspective: myRole,
      contract: {
        id: local.id,
        txn_id: local.txn_id,
        lender_id: local.lender_id,
        borrower_id: local.borrower_id,
        current_user_name: myRole === 'BORROWER' ? 'Borrower' : 'Investor',
        counterparty_name: peer.full_legal_name,
        counterparty_username: peer.username ? `@${peer.username.replace(/^@/, '')}` : null,
        borrower_name: myRole === 'INVESTOR' ? peer.full_legal_name : undefined,
        lender_name: myRole === 'BORROWER' ? peer.full_legal_name : undefined,
        amount: Number(local.amount),
        rate: Number(local.rate),
        duration: Number(local.duration),
        emi_amount: local.emi_amount,
        total_return: local.total_return,
        polygon_tx_hash: local.polygon_tx_hash,
        gocardless_subscription_id: local.gocardless_subscription_id ?? null,
        payment_status: local.payment_status,
        status: local.status,
        created_at: local.created_at,
      },
    });
  };

  const statusBannerClass = cn(
    'px-4 py-2.5 text-center text-xs font-bold leading-snug',
    phase === 'ACTIVE'
      ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
      : phase === 'FUNDED'
        ? 'bg-brand-500/15 text-brand-800 dark:text-brand-200'
        : 'bg-neutral-200/80 text-neutral-700 dark:bg-white/10 dark:text-neutral-300'
  );

  const renderStatusBanner = () => {
    if (phase === 'ACTIVE') {
      return (
        <p className="inline-flex items-center justify-center gap-1.5">
          <ShieldCheck size={14} className="shrink-0" />
          Smart Contract Locked
        </p>
      );
    }

    if (phase === 'FUNDED') {
      if (isInvestor) {
        return (
          <p className="inline-flex items-center justify-center gap-1.5">
            <Wallet size={14} className="shrink-0 text-emerald-600" />
            You funded this · Waiting for borrower to link bank
          </p>
        );
      }
      if (isBorrower) {
        return (
          <p className="inline-flex items-center justify-center gap-1.5">
            <Landmark size={14} className="shrink-0" />
            Escrow funded · Link your bank to receive &amp; start EMI
          </p>
        );
      }
    }

    if (isInvestor) {
      return (
        <p className="inline-flex items-center justify-center gap-1.5">
          <Wallet size={14} className="shrink-0" />
          Review terms &amp; fund escrow to activate this loan
        </p>
      );
    }

    if (isBorrower) {
      return (
        <p className="inline-flex items-center justify-center gap-1.5">
          <Landmark size={14} className="shrink-0 opacity-60" />
          Waiting for investor to fund escrow…
        </p>
      );
    }

    return <p>Handshake in progress</p>;
  };

  const renderActions = () => {
    if (!isInvestor && !isBorrower) return null;

    if (phase === 'ACTIVE') {
      return null;
    }

    if (phase === 'FUNDED') {
      if (isInvestor) {
        return (
          <div className="border-t border-brand-200/40 p-3 dark:border-white/10">
            <div className={mutedBtnClass}>
              <ShieldCheck size={16} className="text-emerald-600" />
              You funded this · Waiting for borrower
            </div>
          </div>
        );
      }

      if (isBorrower) {
        return (
          <div className="border-t border-brand-200/40 p-3 dark:border-white/10">
            <button
              type="button"
              disabled={busy || isRedirecting}
              onClick={() => void linkBankAndStartEmi()}
              className={primaryBtnClass}
            >
              {isRedirecting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Opening GoCardless…
                </>
              ) : (
                <>
                  <Landmark size={16} className="transition group-hover:scale-110" />
                  Link Bank &amp; Start EMI
                </>
              )}
            </button>
          </div>
        );
      }
    }

    if (phase === 'PENDING') {
      if (isBorrower && !local.borrower_approved_at) {
        return (
          <div className="border-t border-brand-200/40 p-3 dark:border-white/10">
            <button
              type="button"
              disabled={busy || isRedirecting}
              onClick={() => void acceptLoanTerms()}
              className={primaryBtnClass}
            >
              {busy ? <Loader2 className="animate-spin" size={16} /> : <Landmark size={16} />}
              Accept Loan Terms
            </button>
          </div>
        );
      }

      if (isInvestor) {
        return (
          <div className="border-t border-brand-200/40 p-3 dark:border-white/10">
            <button
              type="button"
              disabled={busy || isRedirecting}
              onClick={() => void fundEscrowAndAccept()}
              className={primaryBtnClass}
            >
              {isRedirecting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Generating Secure Payment Link…
                </>
              ) : (
                <>
                  <ShieldCheck size={16} className="transition group-hover:scale-110" />
                  Fund Escrow &amp; Accept
                </>
              )}
            </button>
          </div>
        );
      }

      if (isBorrower) {
        return (
          <div className="border-t border-brand-200/40 p-3 dark:border-white/10">
            <div className={mutedBtnClass}>
              <Wallet size={16} className="opacity-50" />
              Waiting for investor to fund…
            </div>
          </div>
        );
      }
    }

    return null;
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

      <div className={statusBannerClass}>{renderStatusBanner()}</div>

      {renderActions()}

      {contractReady && (
        <div className="border-t border-brand-200/40 p-3 dark:border-white/10">
          <button
            type="button"
            onClick={downloadContract}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-neutral-950 py-2.5 text-xs font-black text-white shadow-glow hover:bg-neutral-800 dark:bg-white dark:text-neutral-950"
          >
            <Download size={15} />
            Download Contract PDF
          </button>
        </div>
      )}

      {error && (
        <p className="border-t border-red-200/60 px-3 py-2 text-center text-[11px] font-semibold text-red-600 dark:border-red-900/40 dark:text-red-300">
          {error}
        </p>
      )}

      {phase === 'ACTIVE' && txLink && (
        <a
          href={txLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 border-t border-emerald-200/60 bg-emerald-500/5 py-2.5 text-[11px] font-bold text-emerald-700 dark:border-emerald-900/40 dark:text-emerald-300"
        >
          <ShieldCheck size={12} />
          View on Polygonscan
          <ExternalLink size={12} />
        </a>
      )}
    </article>
  );
}
