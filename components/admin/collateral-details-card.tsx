'use client';

import { useState } from 'react';
import { ExternalLink, Loader2, ShieldAlert } from 'lucide-react';
import { calculateLtvRatio, formatLtvRatio, ltvRiskLevel } from '@/lib/collateral/ltv';
import { cn } from '@/lib/utils';

type CollateralDetailsCardProps = {
  collateralType: string | null;
  collateralValue: number;
  collateralDescription: string | null;
  collateralProofUrl: string | null;
  loanAmount: number;
  onResolveProofUrl?: (storagePath: string) => Promise<string>;
};

export function CollateralDetailsCard({
  collateralType,
  collateralValue,
  collateralDescription,
  collateralProofUrl,
  loanAmount,
  onResolveProofUrl,
}: CollateralDetailsCardProps) {
  const [opening, setOpening] = useState(false);
  const ltv = calculateLtvRatio(loanAmount, collateralValue);
  const risk = ltvRiskLevel(ltv);

  const openProof = async () => {
    if (!collateralProofUrl) return;
    setOpening(true);
    try {
      const url = onResolveProofUrl
        ? await onResolveProofUrl(collateralProofUrl)
        : collateralProofUrl;
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            Collateral Details
          </p>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Security backing for this borrower application.
          </p>
        </div>
        {ltv !== null ? (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold',
              risk === 'warning'
                ? 'bg-red-500/15 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                : 'bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
            )}
          >
            {risk === 'warning' ? <ShieldAlert size={14} /> : null}
            LTV {formatLtvRatio(loanAmount, collateralValue)}
            {risk === 'warning' ? ' — High Risk' : ''}
          </span>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-neutral-500">Type</dt>
          <dd className="font-semibold">{collateralType ?? 'Not provided'}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Estimated Value</dt>
          <dd className="font-semibold">£{Number(collateralValue).toLocaleString('en-GB')}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-neutral-500">Description</dt>
          <dd className="font-semibold">{collateralDescription ?? 'Not provided'}</dd>
        </div>
      </dl>

      {collateralProofUrl ? (
        <button
          type="button"
          onClick={() => void openProof()}
          disabled={opening}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-glow transition hover:bg-brand-400 disabled:opacity-60"
        >
          {opening ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
          View Proof Document
        </button>
      ) : (
        <p className="mt-4 text-xs text-neutral-500">No proof document uploaded.</p>
      )}
    </div>
  );
}
