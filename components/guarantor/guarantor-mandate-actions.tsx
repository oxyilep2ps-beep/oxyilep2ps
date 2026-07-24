'use client';

import { useState } from 'react';

type GuarantorMandateActionsProps = {
  loanId: string;
  email: string;
  token: string;
  issuedAt: string;
};

export function GuarantorMandateActions({
  loanId,
  email,
  token,
  issuedAt,
}: GuarantorMandateActionsProps) {
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (action: 'accept' | 'decline') => {
    setBusy(action);
    setError(null);

    try {
      const res = await fetch('/api/payments/setup-guarantor-mandate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          loanId,
          email,
          token,
          issuedAt,
          action,
        }),
      });

      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        authorisation_url?: string;
        redirectUrl?: string;
      };

      if (!res.ok || body.ok === false) {
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }

      const nextUrl = body.authorisation_url ?? body.redirectUrl;
      if (!nextUrl) {
        throw new Error('No redirect URL returned from mandate setup.');
      }

      window.location.href = nextUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process guarantor action.');
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void submit('decline')}
          className="rounded-2xl border border-neutral-300 px-5 py-3 text-sm font-bold text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-50 dark:border-white/10 dark:text-neutral-200 dark:hover:bg-white/5"
        >
          {busy === 'decline' ? 'Declining…' : 'Decline'}
        </button>
      </div>

      <button
        type="button"
        disabled={busy !== null}
        onClick={() => void submit('accept')}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-brand-600 to-orange-500 px-6 py-3.5 text-sm font-black uppercase tracking-wide text-white shadow-glow transition hover:brightness-110 disabled:opacity-50"
      >
        {busy === 'accept' ? 'Redirecting to bank…' : 'Accept & Set Up Guarantor Mandate'}
      </button>
    </div>
  );
}
