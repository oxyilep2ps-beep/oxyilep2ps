'use client';

import { useEffect } from 'react';

export default function AdminDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[admin-dashboard]', error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl items-center justify-center px-4 py-16">
      <div className="w-full rounded-2xl border border-red-500/40 bg-[#120b0b] p-6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-red-400">Admin error</p>
        <h2 className="mt-3 text-2xl font-black">Something went wrong loading this section.</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/65">
          The admin portal hit an unexpected render error. You can retry this section without
          reloading the whole app.
        </p>
        {error?.digest ? (
          <p className="mt-3 font-mono text-[11px] text-white/40">Digest: {error.digest}</p>
        ) : null}
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-500"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
