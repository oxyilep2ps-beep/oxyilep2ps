'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Handshake, Loader2 } from 'lucide-react';
import {
  listLiveMarketplaceHandshakes,
  reportDefaultedLoanToCreditAgencies,
  resolveLiveHandshakeProofUrl,
} from '@/app/actions/admin-live-handshakes';
import { displayHandshakeStatus, handshakeStatusTone, type AdminLiveHandshakeRow } from '@/lib/types/marketplace-handshake';
import { formatLtvRatio } from '@/lib/collateral/ltv';
import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  gray: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  blue: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  green: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
  amber: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  red: 'bg-red-500/15 text-red-700 dark:text-red-300',
} as const;

function StatusBadge({ status }: { status: string }) {
  const tone = handshakeStatusTone(status);
  return (
    <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide', STATUS_STYLES[tone])}>
      {displayHandshakeStatus(status)}
    </span>
  );
}

export function AdminLiveHandshakesTab() {
  const [rows, setRows] = useState<AdminLiveHandshakeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingProof, setOpeningProof] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listLiveMarketplaceHandshakes();
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load handshakes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const openProof = async (path: string) => {
    setOpeningProof(path);
    try {
      const url = await resolveLiveHandshakeProofUrl(path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setOpeningProof(null);
    }
  };

  const reportDefault = async (handshakeId: string) => {
    setReportingId(handshakeId);
    try {
      const result = await reportDefaultedLoanToCreditAgencies(handshakeId);
      setToast(result.message);
    } finally {
      setReportingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Handshake className="text-brand-500" size={22} />
          <h1 className="text-2xl font-black text-neutral-950 dark:text-white">Live Handshakes</h1>
        </div>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Marketplace loan applications, investor matches, and collateral-backed P2P contracts.
        </p>
      </div>

      {toast ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
          {toast}
        </p>
      ) : null}

      {loading ? (
        <div className="glass-card flex items-center justify-center rounded-2xl p-12">
          <Loader2 size={22} className="animate-spin text-brand-500" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : rows.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center text-sm text-neutral-500">
          No marketplace handshakes yet. Run <code className="text-xs">supabase_phase20_migrations.sql</code> and have
          borrowers submit applications.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/40 bg-white/60 dark:border-white/10 dark:bg-black/40">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200/80 text-xs uppercase tracking-wider text-neutral-500 dark:border-white/10">
                <th className="px-4 py-3 font-bold">Borrower</th>
                <th className="px-4 py-3 font-bold">Investor</th>
                <th className="px-4 py-3 font-bold">Amount</th>
                <th className="px-4 py-3 font-bold">EMI</th>
                <th className="px-4 py-3 font-bold">Collateral</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-neutral-100 dark:border-white/5">
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.borrower_email}</p>
                    <p className="text-xs text-neutral-500">
                      {row.tenure_months}mo · LTV {formatLtvRatio(row.loan_amount, row.collateral_value)}
                    </p>
                    {row.guarantor_email ? (
                      <p className="mt-1 text-xs text-neutral-500">
                        Guarantor: {row.guarantor_email} ({row.guarantor_status})
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                    {row.investor_email ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold">£{row.loan_amount.toLocaleString('en-GB')}</td>
                  <td className="px-4 py-3">£{row.emi_amount.toLocaleString('en-GB')}/mo</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.collateral_type}</p>
                    {row.collateral_proof_url ? (
                      <button
                        type="button"
                        disabled={openingProof === row.collateral_proof_url}
                        onClick={() => void openProof(row.collateral_proof_url)}
                        className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-500"
                      >
                        {openingProof === row.collateral_proof_url ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <ExternalLink size={12} />
                        )}
                        View document
                      </button>
                    ) : (
                      <span className="text-xs text-neutral-400">No proof</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3">
                    {row.status === 'DEFAULTED' ? (
                      <button
                        type="button"
                        disabled={reportingId === row.id}
                        onClick={() => void reportDefault(row.id)}
                        className="rounded-full bg-red-600 px-3 py-1.5 text-[10px] font-bold text-white disabled:opacity-60"
                      >
                        {reportingId === row.id ? 'Sending…' : 'Report to Credit Agencies'}
                      </button>
                    ) : row.status === 'MATCHED' ? (
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          disabled
                          title="Coming soon — Polygon smart contract mint"
                          className="rounded-full bg-neutral-200 px-3 py-1 text-[10px] font-bold text-neutral-500 dark:bg-neutral-800"
                        >
                          Mint Smart Contract
                        </button>
                        <button
                          type="button"
                          disabled
                          title="Coming soon — GoCardless Direct Debit mandate"
                          className="rounded-full bg-neutral-200 px-3 py-1 text-[10px] font-bold text-neutral-500 dark:bg-neutral-800"
                        >
                          Trigger GoCardless Mandate
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
