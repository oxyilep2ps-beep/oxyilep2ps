'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck, XCircle } from 'lucide-react';

function GuarantorCompleteInner() {
  const searchParams = useSearchParams();
  const params = useParams<{ loanId: string }>();
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [detail, setDetail] = useState<string | null>(null);

  const loanId = (searchParams.get('loanId') ?? params.loanId ?? '').trim();
  const email = searchParams.get('email') ?? '';
  const token = searchParams.get('token') ?? '';
  const issuedAt = searchParams.get('issuedAt') ?? '';
  const billingRequestId = searchParams.get('billingRequestId') ?? undefined;
  const stub = searchParams.get('gocardless_stub') === '1';

  useEffect(() => {
    if (!loanId || !email || !token || !issuedAt) {
      setState('error');
      setDetail('Missing guarantor completion data.');
      return;
    }

    const run = async () => {
      try {
        const response = await fetch('/api/payments/complete-guarantor-mandate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            loanId,
            email,
            token,
            issuedAt,
            billingRequestId,
            gocardless_stub: stub,
          }),
        });

        const body = (await response.json()) as { ok?: boolean; error?: string };
        if (!response.ok || !body.ok) {
          setState('error');
          setDetail(body.error ?? 'Could not complete guarantor mandate');
          return;
        }

        setState('ok');
        window.setTimeout(() => {
          router.push(
            `/guarantor/review/${encodeURIComponent(loanId)}?status=accepted&email=${encodeURIComponent(email)}&issuedAt=${encodeURIComponent(issuedAt)}&token=${encodeURIComponent(token)}`
          );
          router.refresh();
        }, 2500);
      } catch (error) {
        setState('error');
        setDetail(error instanceof Error ? error.message : 'Network error');
      }
    };

    void run();
  }, [billingRequestId, email, issuedAt, loanId, router, stub, token]);

  if (state === 'loading') {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <Loader2 className="animate-spin text-brand-500" size={44} />
        <h1 className="mt-6 text-xl font-black text-neutral-950 dark:text-white">Confirming your guarantee</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          Verifying your invite and securing the backup mandate…
        </p>
      </section>
    );
  }

  if (state === 'error') {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <XCircle className="text-red-500" size={52} />
        <h1 className="mt-4 text-xl font-black">Guarantee setup failed</h1>
        <p className="mt-2 text-sm text-red-600">{detail}</p>
        <Link href={`/guarantor/review/${encodeURIComponent(loanId)}`} className="mt-6 text-sm font-semibold text-brand-600">
          Back to review
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto min-h-[80vh] max-w-xl px-4 py-12">
      <div className="overflow-hidden rounded-[1.75rem] border border-emerald-200/80 bg-white shadow-2xl dark:border-emerald-900/40 dark:bg-neutral-950">
        <div className="border-b border-emerald-200/60 bg-gradient-to-r from-emerald-50 to-brand-50 px-6 py-10 text-center dark:from-emerald-950/40 dark:to-neutral-950">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500/15">
            <ShieldCheck className="text-emerald-500" size={44} />
          </div>
          <h1 className="mt-5 text-2xl font-black text-neutral-950 dark:text-white">
            Guarantor Mandate Secured
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
            Your backup mandate is now linked to this loan as a fallback protection.
          </p>
        </div>

        <div className="space-y-4 px-6 py-6">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={20} />
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Guarantor Triggered Payment Ready
              </p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                If the borrower defaults, Oxyile can now use this mandate as the backup collection rail.
              </p>
            </div>
          </div>
          <Link
            href="/chats"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-orange-500 px-6 py-3.5 text-sm font-black uppercase tracking-wide text-white"
          >
            Return to dashboard
            <ExternalLink size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function GuarantorReviewCompletePage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm">Loading…</div>}>
      <GuarantorCompleteInner />
    </Suspense>
  );
}
