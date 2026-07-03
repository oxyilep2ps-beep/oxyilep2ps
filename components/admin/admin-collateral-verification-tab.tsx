'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  FileSearch,
  Loader2,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  listPendingCollateralVerifications,
  rejectCollateralAsset,
  resolveCollateralDocumentUrl,
  verifyCollateralAsset,
} from '@/app/actions/admin-collateral';
import { calculateMaxLtvAmount, type PendingCollateralVerification } from '@/lib/collateral/tracking';
import { createClient } from '@/lib/supabase/client';

function mapRealtimeRow(
  row: Record<string, unknown>,
  previous?: PendingCollateralVerification
): PendingCollateralVerification {
  return {
    id: row.id as string,
    borrower_id: row.borrower_id as string,
    borrower_email: previous?.borrower_email ?? '—',
    loan_amount: Number(row.amount ?? 0),
    asset_declared_value: Number(row.asset_declared_value ?? row.collateral_value ?? 0),
    collateral_docs_url:
      (row.collateral_docs_url as string | null) ??
      (row.collateral_proof_url as string | null) ??
      null,
    collateral_type: (row.collateral_type as string | null) ?? null,
    collateral_status:
      (row.collateral_status as PendingCollateralVerification['collateral_status']) ?? 'pending',
    created_at: (row.created_at as string) ?? previous?.created_at ?? new Date().toISOString(),
  };
}

function applyRealtimePayload(
  prev: PendingCollateralVerification[],
  payload: {
    eventType: string;
    new: Record<string, unknown>;
    old: Record<string, unknown>;
  }
): PendingCollateralVerification[] {
  const event = payload.eventType.toUpperCase();

  if (event === 'DELETE') {
    const id = payload.old.id as string;
    return prev.filter((row) => row.id !== id);
  }

  const mapped = mapRealtimeRow(
    payload.new,
    prev.find((row) => row.id === payload.new.id)
  );

  if (mapped.collateral_status !== 'pending' || payload.new.marketplace !== true) {
    return prev.filter((row) => row.id !== mapped.id);
  }

  const idx = prev.findIndex((row) => row.id === mapped.id);
  if (idx >= 0) {
    const next = [...prev];
    next[idx] = { ...next[idx], ...mapped };
    return next;
  }

  return [mapped, ...prev];
}

export function AdminCollateralVerificationTab() {
  const [pendingVerifications, setPendingVerifications] = useState<PendingCollateralVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingDoc, setOpeningDoc] = useState<string | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<PendingCollateralVerification | null>(null);
  const [approvedValue, setApprovedValue] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listPendingCollateralVerifications();
      setPendingVerifications(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load collateral queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('admin_collateral_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'handshakes' },
        (payload) => {
          setPendingVerifications((prev) =>
            applyRealtimePayload(prev, {
              eventType: payload.eventType,
              new: payload.new as Record<string, unknown>,
              old: (payload.old ?? {}) as Record<string, unknown>,
            })
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const openDocument = async (path: string | null) => {
    if (!path) return;
    setOpeningDoc(path);
    try {
      const url = await resolveCollateralDocumentUrl(path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open document');
    } finally {
      setOpeningDoc(null);
    }
  };

  const submitVerify = async () => {
    if (!verifyTarget) return;
    const value = Number(approvedValue);
    if (!value || value <= 0) {
      setError('Enter the approved asset market value.');
      return;
    }

    setBusyId(verifyTarget.id);
    setError(null);
    const result = await verifyCollateralAsset(verifyTarget.id, value);
    if (!result.ok) {
      setError(result.error ?? 'Verification failed');
    } else {
      setVerifyTarget(null);
      setApprovedValue('');
    }
    setBusyId(null);
  };

  const reject = async (row: PendingCollateralVerification) => {
    setBusyId(row.id);
    setError(null);
    const result = await rejectCollateralAsset(row.id);
    if (!result.ok) setError(result.error ?? 'Rejection failed');
    setBusyId(null);
  };

  const previewLtv = approvedValue ? calculateMaxLtvAmount(Number(approvedValue)) : 0;

  return (
    <section className="space-y-6">
      <header className="rounded-[1.75rem] border border-white/60 bg-white/70 p-6 shadow-glow backdrop-blur-md dark:border-white/10 dark:bg-white/5">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/15 text-brand-600">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-neutral-950 dark:text-white">
              Pending Collateral Verifications
            </h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Manual review queue — verify asset values, apply 70% LTV caps, and unlock marketplace
              visibility for investors. Real-time updates enabled.
            </p>
          </div>
        </div>
      </header>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-[1.5rem] border border-white/60 bg-white/80 shadow-glow backdrop-blur-md dark:border-white/10 dark:bg-white/5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-500">
            <Loader2 className="animate-spin" size={18} />
            Loading verification queue…
          </div>
        ) : pendingVerifications.length === 0 ? (
          <div className="py-16 text-center">
            <FileSearch className="mx-auto text-neutral-400" size={36} />
            <p className="mt-3 text-sm font-semibold text-neutral-600 dark:text-neutral-300">
              No pending collateral reviews
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-neutral-200/80 bg-neutral-50/80 text-[10px] font-black uppercase tracking-wider text-neutral-500 dark:border-white/10 dark:bg-black/20">
                <tr>
                  <th className="px-4 py-3">Borrower</th>
                  <th className="px-4 py-3">Loan Requested</th>
                  <th className="px-4 py-3">Declared Asset Value</th>
                  <th className="px-4 py-3">Collateral</th>
                  <th className="px-4 py-3">Documents</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-white/10">
                {pendingVerifications.map((row) => (
                  <tr key={row.id} className="hover:bg-brand-500/5">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-neutral-900 dark:text-white">{row.borrower_email}</p>
                      <p className="text-[10px] text-neutral-500">
                        {new Date(row.created_at).toLocaleString('en-GB')}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-bold">
                      £{row.loan_amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-brand-700 dark:text-brand-300">
                      £{row.asset_declared_value.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                      {row.collateral_type ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {row.collateral_docs_url ? (
                        <button
                          type="button"
                          disabled={openingDoc === row.collateral_docs_url}
                          onClick={() => void openDocument(row.collateral_docs_url)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline disabled:opacity-50"
                        >
                          {openingDoc === row.collateral_docs_url ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <ExternalLink size={12} />
                          )}
                          View proof
                        </button>
                      ) : (
                        <span className="text-xs text-neutral-400">No document</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => {
                            setVerifyTarget(row);
                            setApprovedValue(String(row.asset_declared_value || ''));
                            setError(null);
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          <CheckCircle2 size={12} />
                          Verify &amp; Approve
                        </button>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void reject(row)}
                          className="inline-flex items-center gap-1 rounded-full border border-red-300 px-3 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:hover:bg-red-950/30"
                        >
                          <XCircle size={12} />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {verifyTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white p-6 shadow-2xl dark:bg-neutral-950">
            <h2 className="text-lg font-black text-neutral-950 dark:text-white">Verify collateral asset</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Borrower declared £{verifyTarget.asset_declared_value.toLocaleString('en-GB')} · Loan requested £
              {verifyTarget.loan_amount.toLocaleString('en-GB')}
            </p>
            <label className="mt-4 block">
              <span className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                Approved asset market value (GBP)
              </span>
              <input
                type="number"
                min={1}
                step="0.01"
                value={approvedValue}
                onChange={(e) => setApprovedValue(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400 dark:border-white/10 dark:bg-black/40"
              />
            </label>
            {previewLtv > 0 ? (
              <p className="mt-2 text-xs font-semibold text-brand-700 dark:text-brand-300">
                70% LTV max loan: £{previewLtv.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setVerifyTarget(null);
                  setApprovedValue('');
                }}
                className="rounded-full px-4 py-2 text-xs font-bold text-neutral-500"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === verifyTarget.id}
                onClick={() => void submitVerify()}
                className="rounded-full bg-brand-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {busyId === verifyTarget.id ? 'Saving…' : 'Confirm verification'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
