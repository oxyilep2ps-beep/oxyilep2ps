'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';

function MandateCompleteInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'ok' | 'error' | 'cancelled'>('loading');
  const [detail, setDetail] = useState<string | null>(null);

  const status = searchParams.get('status');
  const handshakeId = searchParams.get('handshakeId');
  const billingRequestId = searchParams.get('billingRequestId') ?? searchParams.get('billing_request_id');
  const redirectFlowId = searchParams.get('redirect_flow_id') ?? searchParams.get('billing_request_flow_id');
  const stub = searchParams.get('gocardless_stub') === '1';

  useEffect(() => {
    if (status === 'cancelled') {
      setState('cancelled');
      return;
    }

    if (!handshakeId) {
      setState('error');
      setDetail('Missing handshake reference.');
      return;
    }

    const run = async () => {
      try {
        const res = await fetch('/api/payments/complete-handshake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            handshakeId,
            billingRequestId,
            redirectFlowId,
            stub,
          }),
        });
        const body = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !body.ok) {
          setState('error');
          setDetail(body.error ?? 'Could not finalize handshake');
          return;
        }
        setState('ok');
        window.setTimeout(() => {
          router.push(`/chats?handshake=complete&hid=${handshakeId}`);
          router.refresh();
        }, 2200);
      } catch (e) {
        setState('error');
        setDetail(e instanceof Error ? e.message : 'Network error');
      }
    };

    void run();
  }, [status, handshakeId, billingRequestId, redirectFlowId, stub, router]);

  return (
    <section className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      {state === 'loading' && (
        <>
          <Loader2 className="animate-spin text-brand-500" size={40} />
          <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-300">
            Linking your bank, minting contract, and activating auto-EMI…
          </p>
        </>
      )}
      {state === 'ok' && (
        <>
          <CheckCircle2 className="text-emerald-500" size={48} />
          <h1 className="mt-4 text-xl font-black text-neutral-950 dark:text-white">All set</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Bank linked, smart contract minted, and auto-EMI scheduled. Returning to chat…
          </p>
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
