'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck, Wallet, XCircle } from 'lucide-react';
import { confirmEscrowAndRoute } from '@/app/actions/payment';
import { resolveHandshakeIdFromParams } from '@/lib/payments/pending-handshake';
import { polygonAmoyTxUrl } from '@/lib/web3/polygon-amoy';

function JITSuccessInner() {
  const searchParams = useSearchParams();
  const handshakeId = resolveHandshakeIdFromParams(searchParams);
  const billingRequestId = searchParams.get('billing_request_id') ?? undefined;

  const [phase, setPhase] = useState<'confirming' | 'success' | 'error'>('confirming');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!handshakeId) {
      setPhase('error');
      setError('Missing handshake reference. Return to chat and try again.');
      return;
    }

    const run = async () => {
      const result = await confirmEscrowAndRoute(handshakeId, billingRequestId);
      if (!result.success) {
        setPhase('error');
        setError(result.error);
        return;
      }
      setTxHash(result.txHash);
      setPhase('success');
    };

    void run();
  }, [handshakeId, billingRequestId]);

  if (phase === 'confirming') {
    return (
      <section className="mx-auto flex min-h-[75vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <div className="relative grid h-20 w-20 place-items-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-brand-500/20" />
          <Loader2 className="relative animate-spin text-brand-500" size={44} />
        </div>
        <h1 className="mt-6 text-xl font-black text-neutral-950 dark:text-white">
          Securing escrow &amp; routing funds
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          Confirming GoCardless payment, updating ledger, and anchoring on Polygon Amoy…
        </p>
      </section>
    );
  }

  if (phase === 'error') {
    return (
      <section className="mx-auto flex min-h-[75vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <XCircle className="text-red-500" size={52} />
        <h1 className="mt-4 text-xl font-black text-neutral-950 dark:text-white">Routing failed</h1>
        <p className="mt-2 text-sm text-red-600 dark:text-red-300">{error}</p>
        <Link href="/chats" className="mt-6 text-sm font-semibold text-brand-600">
          Back to chats
        </Link>
      </section>
    );
  }

  const explorerUrl = txHash ? polygonAmoyTxUrl(txHash) : null;

  return (
    <section className="mx-auto min-h-[80vh] max-w-xl px-4 py-12">
      <div className="overflow-hidden rounded-[1.75rem] border border-emerald-200/80 bg-white shadow-2xl dark:border-emerald-900/40 dark:bg-neutral-950">
        <div className="border-b border-emerald-200/60 bg-gradient-to-r from-emerald-50 via-brand-50 to-orange-50 px-6 py-8 text-center dark:border-emerald-900/30 dark:from-emerald-950/40 dark:via-neutral-950 dark:to-neutral-950">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500/15 ring-4 ring-emerald-500/20">
            <CheckCircle2 className="text-emerald-500" size={44} />
          </div>
          <h1 className="mt-5 text-2xl font-black tracking-tight text-neutral-950 dark:text-white">
            Funds Routed Successfully
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
            Your JIT escrow deposit is secured and the borrower repayment schedule is locked on-chain.
          </p>
        </div>

        <div className="space-y-4 px-6 py-6">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <Wallet className="mt-0.5 shrink-0 text-emerald-600" size={20} />
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Fiat Payment Secured via GoCardless
              </p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                Investor escrow funds are held in Oxyile&apos;s segregated client money account. Borrower
                Direct Debit mandate routing is activated for EMI collections.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-brand-200/70 bg-brand-500/5 p-4 dark:border-brand-500/25 dark:bg-brand-500/10">
            <ShieldCheck className="mt-0.5 shrink-0 text-brand-600" size={20} />
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-brand-700 dark:text-brand-300">
                Smart Contract Locked on Polygon
              </p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                Handshake terms (borrower, investor, principal, duration) are hashed and immutably
                recorded on Polygon Amoy by the Oxyile relayer — no wallet popups required.
              </p>
            </div>
          </div>

          {txHash ? (
            <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-white/10 dark:bg-black/30">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Polygon Amoy Transaction
              </p>
              <p className="mt-2 break-all font-mono text-xs text-neutral-800 dark:text-neutral-200">
                {txHash}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-neutral-100 bg-neutral-50/50 px-6 py-5 dark:border-white/10 dark:bg-black/30">
          {explorerUrl ? (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-orange-500 px-6 py-3.5 text-sm font-black uppercase tracking-wide text-white shadow-glow transition hover:brightness-110"
            >
              <ExternalLink size={18} />
              View on Polygonscan
            </a>
          ) : null}
          <Link
            href={handshakeId ? `/chats?handshake=complete&hid=${handshakeId}` : '/chats'}
            className="text-center text-sm font-semibold text-brand-600 hover:text-brand-500"
          >
            Return to handshake chat
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function HandshakeSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="animate-spin text-brand-500" size={32} />
        </div>
      }
    >
      <JITSuccessInner />
    </Suspense>
  );
}
