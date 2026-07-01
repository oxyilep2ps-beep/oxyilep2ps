'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, ExternalLink, Loader2, Wallet, XCircle } from 'lucide-react';
import { confirmEscrowAndRoute } from '@/app/actions/payment';
import { resolveHandshakeIdFromParams } from '@/lib/payments/pending-handshake';

function InvestorFundSuccessInner() {
  const searchParams = useSearchParams();
  const handshakeId = resolveHandshakeIdFromParams(searchParams);
  const billingRequestId = searchParams.get('billing_request_id') ?? undefined;

  const [phase, setPhase] = useState<'confirming' | 'success' | 'error'>('confirming');
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
      setPhase('success');
    };

    void run();
  }, [handshakeId, billingRequestId]);

  if (phase === 'confirming') {
    return (
      <section className="mx-auto flex min-h-[75vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <Loader2 className="animate-spin text-brand-500" size={44} />
        <h1 className="mt-6 text-xl font-black text-neutral-950 dark:text-white">
          Confirming escrow deposit
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          Verifying your GoCardless payment and securing funds in escrow…
        </p>
      </section>
    );
  }

  if (phase === 'error') {
    return (
      <section className="mx-auto flex min-h-[75vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <XCircle className="text-red-500" size={52} />
        <h1 className="mt-4 text-xl font-black">Funding failed</h1>
        <p className="mt-2 text-sm text-red-600">{error}</p>
        <Link href="/chats" className="mt-6 text-sm font-semibold text-brand-600">
          Back to chats
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto min-h-[80vh] max-w-xl px-4 py-12">
      <div className="overflow-hidden rounded-[1.75rem] border border-emerald-200/80 bg-white shadow-2xl dark:border-emerald-900/40 dark:bg-neutral-950">
        <div className="border-b border-emerald-200/60 bg-gradient-to-r from-emerald-50 to-brand-50 px-6 py-10 text-center dark:from-emerald-950/40 dark:to-neutral-950">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500/15">
            <CheckCircle2 className="text-emerald-500" size={44} />
          </div>
          <h1 className="mt-5 text-2xl font-black text-neutral-950 dark:text-white">
            Escrow Funded Successfully
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
            Fiat payment secured via GoCardless. The borrower can now link their bank to receive
            funds and start EMI repayments.
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
                Your escrow deposit is held in Oxyile&apos;s segregated client money account until
                the borrower completes their Direct Debit mandate.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-100 px-6 py-5 dark:border-white/10">
          <Link
            href={handshakeId ? `/chats?hid=${handshakeId}` : '/chats'}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-orange-500 px-6 py-3.5 text-sm font-black uppercase tracking-wide text-white"
          >
            Return to handshake chat
            <ExternalLink size={16} />
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
      <InvestorFundSuccessInner />
    </Suspense>
  );
}
