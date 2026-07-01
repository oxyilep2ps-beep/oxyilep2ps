'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import Link from 'next/link';
import { completeBorrowerBankLink } from '@/app/actions/payment';
import {
  clearPendingHandshakeId,
  resolveHandshakeIdFromParams,
} from '@/lib/payments/pending-handshake';
import { polygonAmoyTxUrl } from '@/lib/web3/polygon-amoy';

function MandateCompleteInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'ok' | 'error' | 'cancelled'>('loading');
  const [detail, setDetail] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const status = searchParams.get('status');
  const handshakeId = resolveHandshakeIdFromParams(searchParams);
  const billingRequestId = searchParams.get('billingRequestId') ?? searchParams.get('billing_request_id');
  const stub = searchParams.get('gocardless_stub') === '1';

  useEffect(() => {
    if (status === 'cancelled') {
      setState('cancelled');
      return;
    }

    if (!handshakeId) {
      router.replace('/chats');
      return;
    }

    const run = async () => {
      try {
        if (stub && !billingRequestId) {
          router.replace(`/payments/sandbox?handshakeId=${encodeURIComponent(handshakeId)}`);
          return;
        }

        const result = await completeBorrowerBankLink(
          handshakeId,
          billingRequestId ?? undefined
        );

        if (!result.success) {
          setState('error');
          setDetail(result.error);
          return;
        }

        clearPendingHandshakeId();
        setTxHash(result.txHash);
        setState('ok');
        window.setTimeout(() => {
          router.push(`/chats?handshake=complete&hid=${handshakeId}`);
          router.refresh();
        }, 3200);
      } catch (e) {
        setState('error');
        setDetail(e instanceof Error ? e.message : 'Network error');
      }
    };

    void run();
  }, [status, handshakeId, billingRequestId, stub, router]);

  const explorerUrl = txHash ? polygonAmoyTxUrl(txHash) : null;

  return (
    <section className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      {state === 'loading' && (
        <>
          <Loader2 className="animate-spin text-brand-500" size={40} />
          <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-300">
            Linking your bank, locking the smart contract on Polygon, and activating EMI…
          </p>
        </>
      )}
      {state === 'ok' && (
        <>
          <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15">
            <ShieldCheck className="text-emerald-500" size={40} />
          </div>
          <h1 className="mt-4 text-xl font-black text-neutral-950 dark:text-white">
            Funds Routed Successfully
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
            Fiat payment secured via GoCardless · Smart contract locked on Polygon
          </p>
          {explorerUrl ? (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600"
            >
              View on Polygonscan
              <ExternalLink size={14} />
            </a>
          ) : null}
          <p className="mt-3 text-xs text-neutral-500">Returning to chat…</p>
        </>
      )}
      {state === 'cancelled' && (
        <>
          <XCircle className="text-amber-500" size={48} />
          <h1 className="mt-4 text-xl font-black">Mandate setup cancelled</h1>
          <Link href="/chats" className="mt-4 text-sm font-semibold text-brand-600">
            Back to chats
          </Link>
        </>
      )}
      {state === 'error' && (
        <>
          <XCircle className="text-red-500" size={48} />
          <h1 className="mt-4 text-xl font-black">Something went wrong</h1>
          <p className="mt-2 text-sm text-red-600">{detail}</p>
          <Link href="/chats" className="mt-4 text-sm font-semibold text-brand-600">
            Back to chats
          </Link>
        </>
      )}
    </section>
  );
}

export default function MandateCompletePage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm">Loading…</div>}>
      <MandateCompleteInner />
    </Suspense>
  );
}
