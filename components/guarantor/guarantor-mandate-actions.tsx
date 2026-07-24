'use client';

import { useState } from 'react';

type GuarantorMandateActionsProps = {
  loanId: string;
  email: string;
  token: string;
  issuedAt: string;
};

function isGoCardlessHostedUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return (
      url.protocol === 'https:' &&
      (url.hostname === 'pay-sandbox.gocardless.com' ||
        url.hostname === 'pay.gocardless.com' ||
        url.hostname.endsWith('.gocardless.com'))
    );
  } catch {
    return false;
  }
}

/**
 * Opens the GoCardless hosted flow with a guaranteed top-level GET.
 * Direct POSTs (and 307 form redirects) to pay-sandbox cause:
 * "POST object expects Content-Type multipart/form-data".
 */
function navigateWithGet(targetUrl: string) {
  if (isGoCardlessHostedUrl(targetUrl)) {
    // Route through our GET handoff so the browser can never re-POST to GoCardless.
    const handoff = new URL('/api/payments/gocardless-handoff', window.location.origin);
    handoff.searchParams.set('to', targetUrl);
    window.location.assign(handoff.toString());
    return;
  }

  window.location.assign(targetUrl);
}

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
        // Never follow a redirect into GoCardless from fetch — we navigate ourselves with GET.
        redirect: 'manual',
        body: JSON.stringify({
          loanId,
          email,
          token,
          issuedAt,
          action,
        }),
      });

      // Opaque redirect responses should not happen (API returns JSON only), but guard anyway.
      if (res.type === 'opaqueredirect' || (res.status >= 300 && res.status < 400)) {
        throw new Error(
          'Unexpected redirect from mandate API. Please retry — the server must return JSON, not a redirect.'
        );
      }

      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(
          text.includes('multipart/form-data')
            ? 'GoCardless received a POST instead of GET. Close this tab, reopen the invite link, and try again.'
            : `Unexpected response from mandate API (${res.status}).`
        );
      }

      const body = (await res.json()) as {
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

      navigateWithGet(nextUrl);
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
