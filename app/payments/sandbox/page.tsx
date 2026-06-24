'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ExternalLink, Loader2, Lock, ShieldCheck, XCircle } from 'lucide-react';
import { recordHandshakeOnChain } from '@/app/actions/recordHandshakeOnChain';
import { GoCardlessSandboxForm } from '@/components/payments/gocardless-sandbox-form';
import {
  clearPendingHandshakeId,
  resolveHandshakeIdFromParams,
} from '@/lib/payments/pending-handshake';
import { polygonAmoyTxUrl } from '@/lib/web3/polygon-amoy';

type HandshakePreview = {
  id: string;
  reference: string;
  amount: number;
  rate: number;
  duration: number;
  status: string;
  payment_status: string;
  emi_amount: number;
  total_return: number;
  role: string;
};

const PROCESSING_STEPS = [
  'Processing secure bank payment via GoCardless…',
  'Hashing handshake agreement (Web2.5 relayer)…',
  'Recording immutable proof on Polygon Amoy…',
  'Activating escrow in Oxyile Protocol…',
] as const;

function PaymentSandboxInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const handshakeId = resolveHandshakeIdFromParams(searchParams);

  const [preview, setPreview] = useState<HandshakePreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'checkout' | 'processing' | 'success' | 'error'>('checkout');
  const [processingStep, setProcessingStep] = useState(0);
  const [payError, setPayError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (!handshakeId) {
      setLoadError('Missing handshake reference. Return to chat and try again.');
      return;
    }

    const load = async () => {
      try {
        const res = await fetch(
          `/api/payments/handshake-preview?handshakeId=${encodeURIComponent(handshakeId)}`
        );
        const body = (await res.json()) as {
          ok?: boolean;
          handshake?: HandshakePreview;
          error?: string;
        };
        if (!res.ok || !body.ok || !body.handshake) {
          setLoadError(body.error ?? 'Could not load handshake');
          return;
        }
        setPreview(body.handshake);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Network error');
      }
    };

    void load();
  }, [handshakeId]);

  const runHybridEscrow = useCallback(async () => {
    if (!handshakeId || !preview) return;

    if (preview.role !== 'borrower') {
      setPayError('Only the borrower can authorise the escrow bank transfer for this handshake.');
      setPhase('error');
      return;
    }

    setPhase('processing');
    setProcessingStep(0);
    setPayError(null);

    const stepInterval = window.setInterval(() => {
      setProcessingStep((prev) => Math.min(prev + 1, PROCESSING_STEPS.length - 1));
    }, 1400);

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 2200));
      setProcessingStep(1);

      const result = await recordHandshakeOnChain(handshakeId);

      if (!result.ok) {
        setPhase('error');
        setPayError(result.error);
        return;
      }

      clearPendingHandshakeId();
      setTxHash(result.txHash);
      setPhase('success');
    } catch (e) {
      setPhase('error');
      setPayError(e instanceof Error ? e.message : 'Escrow funding failed');
    } finally {
      window.clearInterval(stepInterval);
    }
  }, [handshakeId, preview]);

  if (loadError) {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <XCircle className="text-red-500" size={48} />
        <h1 className="mt-4 text-xl font-black text-neutral-950 dark:text-white">Handshake not found</h1>
        <p className="mt-2 text-sm text-red-600">{loadError}</p>
        <Link href="/chats" className="mt-6 text-sm font-semibold text-brand-600">
          Back to chats
        </Link>
      </section>
    );
  }

  if (!preview) {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16">
        <Loader2 className="animate-spin text-brand-500" size={40} />
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-300">Loading escrow details…</p>
      </section>
    );
  }

  if (phase === 'success' && txHash) {
    const explorerUrl = polygonAmoyTxUrl(txHash);
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-500/15">
          <ShieldCheck className="text-emerald-500" size={48} />
        </div>
        <h1 className="mt-6 text-2xl font-black text-neutral-950 dark:text-white">
          Escrow Funded Successfully
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          Your funds are securely held in the client money account. The legal handshake agreement has been
          hashed and permanently recorded on the blockchain — with no wallet popups required.
        </p>
        <div className="mt-6 w-full max-w-md rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 text-left dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            Polygon Amoy Transaction
          </p>
          <p className="mt-2 break-all font-mono text-xs text-neutral-800 dark:text-neutral-200">{txHash}</p>
        </div>
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-orange-500 px-8 py-3.5 text-sm font-black uppercase tracking-wide text-white shadow-glow transition hover:brightness-110"
        >
          <ExternalLink size={18} />
          View Immutable Record on Polygonscan
        </a>
        <button
          type="button"
          onClick={() => {
            router.push(`/chats?handshake=complete&hid=${handshakeId}`);
            router.refresh();
          }}
          className="mt-4 text-sm font-semibold text-brand-600"
        >
          Return to chat
        </button>
      </section>
    );
  }

  if (phase === 'processing') {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <div className="relative grid h-20 w-20 place-items-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-brand-500/20" />
          <Loader2 className="relative animate-spin text-brand-500" size={44} />
        </div>
        <h1 className="mt-6 text-xl font-black text-neutral-950 dark:text-white">Securing your handshake</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          {PROCESSING_STEPS[processingStep]}
        </p>
        <p className="mt-4 text-xs text-neutral-500">Fiat rails + blockchain relayer — please keep this tab open.</p>
      </section>
    );
  }

  if (phase === 'error') {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <XCircle className="text-red-500" size={48} />
        <h1 className="mt-4 text-xl font-black">Escrow funding failed</h1>
        <p className="mt-2 text-sm text-red-600">{payError}</p>
        <button
          type="button"
          onClick={() => {
            setPhase('checkout');
            setPayError(null);
          }}
          className="mt-6 rounded-full bg-brand-500 px-6 py-2.5 text-sm font-bold text-white"
        >
          Try again
        </button>
      </section>
    );
  }

  const isBorrower = preview.role === 'borrower';

  return (
    <section className="mx-auto min-h-[80vh] max-w-xl px-4 py-10">
      <div className="overflow-hidden rounded-[1.75rem] border border-neutral-200/80 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-950">
        <div className="border-b border-amber-200/80 bg-gradient-to-r from-amber-50 via-orange-50 to-brand-50 px-6 py-3 dark:border-amber-900/40 dark:from-amber-950/40 dark:to-neutral-950">
          <p className="flex items-center justify-center gap-2 text-center text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
            <ShieldCheck size={14} />
            Web2.5 Escrow · GoCardless Sandbox + Polygon Relayer
          </p>
        </div>

        <div className="border-b border-neutral-100 px-6 py-8 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/10 text-brand-600">
              <Lock size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Oxyile Client Money Escrow</p>
              <h1 className="text-2xl font-black text-neutral-950 dark:text-white">Fund handshake escrow</h1>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-200/60 p-3 text-center dark:border-white/10">
              <p className="text-[10px] font-bold uppercase text-neutral-500">Principal</p>
              <p className="mt-1 text-sm font-bold">
                £{preview.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200/60 p-3 text-center dark:border-white/10">
              <p className="text-[10px] font-bold uppercase text-neutral-500">Rate</p>
              <p className="mt-1 text-sm font-bold">{preview.rate}% p.a.</p>
            </div>
            <div className="rounded-xl border border-neutral-200/60 p-3 text-center dark:border-white/10">
              <p className="text-[10px] font-bold uppercase text-neutral-500">EMI (est.)</p>
              <p className="mt-1 text-sm font-bold">
                £{preview.emi_amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {isBorrower ? (
            <GoCardlessSandboxForm
              amountGbp={preview.amount}
              reference={preview.reference}
              onAuthorize={runHybridEscrow}
            />
          ) : (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              You are viewing as the investor. The borrower must authorise the GoCardless bank transfer to fund
              escrow. The handshake hash is recorded on Polygon automatically by the Oxyile relayer.
            </p>
          )}

          <div className="flex items-start gap-3 rounded-xl border border-brand-200/60 bg-brand-500/5 p-4 dark:border-brand-500/20">
            <ShieldCheck className="mt-0.5 shrink-0 text-brand-600" size={18} />
            <p className="text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
              Fiat collections are processed via GoCardless (FCA-regulated payment institution). Your handshake
              agreement is hashed server-side and anchored on Polygon Amoy — no MetaMask or crypto wallet
              required.
            </p>
          </div>
        </div>

        <div className="border-t border-neutral-100 bg-neutral-50/50 px-6 py-4 dark:border-white/10 dark:bg-black/30">
          <Link
            href="/chats"
            className="block text-center text-xs font-semibold text-neutral-500 hover:text-brand-600"
          >
            Cancel and return to chat
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function PaymentSandboxPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="animate-spin text-brand-500" size={32} />
        </div>
      }
    >
      <PaymentSandboxInner />
    </Suspense>
  );
}
