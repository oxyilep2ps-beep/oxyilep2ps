'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { fundMarketplaceLoan, listMarketplaceOpportunities } from '@/app/actions/marketplace';
import { calculateLtvRatio, formatLtvRatio, ltvRiskLevel } from '@/lib/collateral/ltv';
import { FIXED_INTEREST_RATE_LABEL } from '@/lib/platform/constants';
import type { MarketplaceHandshakeRow } from '@/lib/types/marketplace-handshake';
import { cn } from '@/lib/utils';

function OpportunityCard({
  row,
  onFunded,
}: {
  row: MarketplaceHandshakeRow;
  onFunded: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const ltv = calculateLtvRatio(row.loan_amount, row.collateral_value);
  const risk = ltvRiskLevel(ltv);

  const fund = async () => {
    setBusy(true);
    setMessage(null);
    const result = await fundMarketplaceLoan(row.id);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.error ?? 'Could not fund loan.');
      return;
    }
    onFunded();
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card flex flex-col rounded-[1.75rem] p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-500">Loan opportunity</p>
          <p className="mt-1 text-2xl font-black text-neutral-950 dark:text-white">
            £{row.loan_amount.toLocaleString('en-GB')}
          </p>
          <p className="text-sm text-neutral-500">{row.tenure_months} months · EMI £{row.emi_amount.toLocaleString('en-GB')}/mo</p>
        </div>
        {ltv !== null ? (
          <span
            className={cn(
              'rounded-full px-3 py-1 text-xs font-bold',
              risk === 'safe'
                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
            )}
          >
            LTV {formatLtvRatio(row.loan_amount, row.collateral_value)}
          </span>
        ) : null}
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-neutral-500">Expected return</dt>
          <dd className="font-semibold">{FIXED_INTEREST_RATE_LABEL}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Collateral type</dt>
          <dd className="font-semibold">{row.collateral_type}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Collateral value</dt>
          <dd className="font-semibold">£{row.collateral_value.toLocaleString('en-GB')}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-neutral-500">Description</dt>
          <dd className="font-medium text-neutral-700 dark:text-neutral-300">{row.collateral_description}</dd>
        </div>
      </dl>

      <button
        type="button"
        disabled={busy}
        onClick={() => void fund()}
        className="mt-6 w-full rounded-full bg-brand-500 py-3 text-sm font-bold text-white shadow-glow disabled:opacity-60"
      >
        {busy ? <Loader2 size={16} className="mx-auto animate-spin" /> : 'Fund this Loan (Initiate Handshake)'}
      </button>
      {message ? <p className="mt-2 text-center text-xs text-red-600">{message}</p> : null}
    </motion.article>
  );
}

export function MarketplaceGrid() {
  const [rows, setRows] = useState<MarketplaceHandshakeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listMarketplaceOpportunities();
    setRows(result.rows);
    setError(result.error ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="glass-card flex items-center justify-center rounded-2xl p-16">
        <Loader2 size={24} className="animate-spin text-brand-500" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30">
        {error}
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center">
        <TrendingUp className="mx-auto text-brand-500" size={32} />
        <p className="mt-4 font-semibold text-neutral-950 dark:text-white">No open opportunities</p>
        <p className="mt-2 text-sm text-neutral-500">Check back soon for new collateral-backed borrower applications.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {rows.map((row) => (
        <OpportunityCard key={row.id} row={row} onFunded={load} />
      ))}
    </div>
  );
}
