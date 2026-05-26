'use client';

import { useState } from 'react';
import { Download, ExternalLink, FileSignature, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatContractLabel } from '@/lib/handshake/calculations';
import type { ChatPeer, HandshakeRow, MemberRole } from '@/lib/chat/types';
import { generateContractPDF } from '@/lib/pdf/contract-pdf';
import { cn } from '@/lib/utils';

type HandshakeCardProps = {
  handshake: HandshakeRow;
  myId: string;
  myRole: MemberRole;
  peer: ChatPeer;
  onUpdated: () => void;
};

function polygonUrl(hash: string | null): string | null {
  if (!hash || !/^0x[a-fA-F0-9]{64}$/.test(hash)) return null;
  return `https://amoy.polygonscan.com/tx/${hash}`;
}

function paymentStatusLine(local: HandshakeRow): string | null {
  if (local.status !== 'ACTIVE') return null;
  const bank = local.mandate_linked ?? (local.payment_status === 'ACTIVE' || local.payment_status === 'PAID');
  const contract = Boolean(local.polygon_tx_hash);
  const emi = local.auto_emi_active;
  if (bank && contract && emi) {
    return 'Bank Linked ✅ | Smart Contract Minted 🔗 | Auto-EMI Active';
  }
  const parts: string[] = [];
  if (bank) parts.push('Bank Linked ✅');
  if (contract) parts.push('Smart Contract Minted 🔗');
  if (emi) parts.push('Auto-EMI Active');
  return parts.length ? parts.join(' | ') : null;
}

function pendingStatusLine(local: HandshakeRow): string {
  const lenderApproved = Boolean(local.lender_approved_at);
  const borrowerApproved = Boolean(local.borrower_approved_at);

  if (lenderApproved && !borrowerApproved) return 'Waiting for Borrower to Link Bank';
  if (!lenderApproved && borrowerApproved) return 'Waiting for Investor';
  if (lenderApproved && borrowerApproved) return 'Waiting for Bank Link';
  return 'Waiting for Investor and Borrower';
}

export function HandshakeCard({ handshake, myId, myRole, peer, onUpdated }: HandshakeCardProps) {
  const [busy, setBusy] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [local, setLocal] = useState(handshake);

  const isBorrower = myRole === 'BORROWER' && myId === local.borrower_id;
  const isInvestor = myRole === 'INVESTOR' && myId === local.lender_id;

  const approvedByMe =
    (isInvestor && Boolean(local.lender_approved_at)) ||
    (isBorrower && Boolean(local.borrower_approved_at));

  const bothApproved = Boolean(local.lender_approved_at && local.borrower_approved_at);
  const label = formatContractLabel(local.status, local.payment_status);
  const txLink = polygonUrl(local.polygon_tx_hash);
  const railLine = paymentStatusLine(local);
  const statusText = local.status === 'PENDING' ? pendingStatusLine(local) : (railLine ?? label);
  const contractReady = Boolean(
    local.status === 'ACTIVE' &&
      local.polygon_tx_hash &&
      (local.mandate_linked || local.auto_emi_active || local.gocardless_subscription_id)
  );

  const redirectToMandate = async () => {
    setIsProcessingPayment(true);
    setError(null);

    const res = await fetch('/api/payments/setup-mandate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        borrowerId: local.borrower_id,
        lenderId: local.lender_id,
        handshakeId: local.id,
      }),
    });
    const body = (await res.json()) as {
      authorisation_url?: string;
      error?: string;
    };

    if (!res.ok || !body.authorisation_url) {
      setIsProcessingPayment(false);
      throw new Error(body.error ?? 'Could not start GoCardless');
    }

    window.location.href = body.authorisation_url;
  };

  const approve = async () => {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const patch: Record<string, string> = {};
    const now = new Date().toISOString();

    if (isInvestor && !local.lender_approved_at) patch.lender_approved_at = now;
    if (isBorrower && !local.borrower_approved_at) patch.borrower_approved_at = now;

    const { error } = await supabase.from('handshakes').update(patch).eq('id', local.id);
    if (error) {
      setError(error.message);
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

    if (isBorrower) {
      try {
        await redirectToMandate();
        return;
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Could not start GoCardless checkout';
        console.error('[HandshakeCard] GoCardless redirect failed', e);
        setError(message);
        setIsProcessingPayment(false);
      }
    }

    if (isInvestor && lenderOk && borrowerOk) {
      onUpdated();
      setBusy(false);
      return;
    }

    onUpdated();
    setBusy(false);
  };

  const linkBankLater = async () => {
    setBusy(true);
    setError(null);
    try {
      await redirectToMandate();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not start GoCardless checkout';
      console.error('[HandshakeCard] GoCardless redirect failed', e);
      setError(message);
      setIsProcessingPayment(false);
    } finally {
      setBusy(false);
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
          local.status === 'ACTIVE' && (railLine || local.auto_emi_active)
            ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
            : local.status === 'ACTIVE'
              ? 'bg-amber-500/20 text-amber-900 dark:text-amber-200'
              : local.lender_approved_at || local.borrower_approved_at
                ? 'bg-amber-500/20 text-amber-900 dark:text-amber-200'
                : 'bg-neutral-200/80 text-neutral-700 dark:bg-white/10 dark:text-neutral-300'
        )}
      >
        {statusText}
      </div>

      {local.status === 'PENDING' && !bothApproved && (
        <div className="border-t border-brand-200/40 p-3 dark:border-white/10">
          <button
            type="button"
            disabled={busy || isProcessingPayment || approvedByMe}
            onClick={() => void approve()}
            className="w-full rounded-full bg-brand-500 py-2.5 text-xs font-bold text-white shadow-glow hover:bg-brand-400 disabled:opacity-50"
          >
            {busy || isProcessingPayment ? (
              <Loader2 className="mx-auto animate-spin" size={16} />
            ) : approvedByMe ? (
              'You approved'
            ) : isBorrower ? (
              'Approve & link bank'
            ) : (
              'Approve handshake'
            )}
          </button>
        </div>
      )}

      {local.status === 'ACTIVE' && isBorrower && bothApproved && !contractReady && (
        <div className="border-t border-brand-200/40 p-3 dark:border-white/10">
          <button
            type="button"
            disabled={busy || isProcessingPayment}
            onClick={() => void linkBankLater()}
            className="w-full rounded-full bg-brand-500 py-2 text-xs font-bold text-white"
          >
            {busy || isProcessingPayment ? 'Redirecting…' : 'Link bank (GoCardless)'}
          </button>
        </div>
      )}

      {contractReady && (
        <div className="border-t border-brand-200/40 p-3 dark:border-white/10">
          <button
            type="button"
            onClick={downloadContract}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-neutral-950 py-2.5 text-xs font-black text-white shadow-glow hover:bg-neutral-800 dark:bg-white dark:text-neutral-950"
          >
            <Download size={15} />
            📥 Download Contract PDF
          </button>
        </div>
      )}

      {error && (
        <p className="border-t border-red-200/60 px-3 py-2 text-center text-[11px] font-semibold text-red-600 dark:border-red-900/40 dark:text-red-300">
          {error}
        </p>
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
