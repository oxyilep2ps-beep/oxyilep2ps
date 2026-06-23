'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Loader2, Pencil, Users } from 'lucide-react';
import {
  getCollateralProofSignedUrl,
  getWaitlistMetrics,
  getWaitlistUser,
  listWaitlistUsers,
  type WaitlistMetrics,
  type WaitlistRow,
} from '@/app/actions/admin-waitlist';
import { CollateralDetailsCard } from '@/components/admin/collateral-details-card';
import {
  getWaitlistDisplayStatus,
  getWaitlistDisplayUserType,
  WaitlistEditModal,
} from '@/components/admin/waitlist-edit-modal';
import { exportWaitlistProfilePdf } from '@/lib/pdf/waitlist-profile-pdf';
import { FIXED_INTEREST_RATE_LABEL } from '@/lib/platform/constants';
import { formatQuestionnaireAnswer } from '@/lib/questionnaire/strategic-questions';
import { cn } from '@/lib/utils';

function firstValue(record: Record<string, string | boolean>, keys: string[]): string {
  for (const key of keys) {
    if (key in record) {
      return formatQuestionnaireAnswer(record[key]);
    }
  }
  return 'Not provided';
}

const STATUS_STYLES = {
  pending: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  approved: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
  rejected: 'bg-red-500/15 text-red-700 dark:text-red-300',
} as const;

export function AdminWaitlistTab() {
  const [rows, setRows] = useState<WaitlistRow[]>([]);
  const [metrics, setMetrics] = useState<WaitlistMetrics | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WaitlistRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [editRow, setEditRow] = useState<WaitlistRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, stats] = await Promise.all([listWaitlistUsers(), getWaitlistMetrics()]);
      setRows(list);
      setMetrics(stats);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void getWaitlistUser(selectedId).then(setDetail);
  }, [selectedId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleSaved = (updated: WaitlistRow) => {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    if (selectedId === updated.id) setDetail(updated);
    setToast(`Updated ${updated.name} successfully.`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-neutral-950 dark:text-white">Waitlisted Users</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Early-access signups with queue rank and questionnaire responses.
        </p>
      </div>

      {toast ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
          {toast}
        </p>
      ) : null}

      {metrics && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Total Users', value: metrics.total, icon: Users },
            { label: 'Borrowers', value: metrics.borrowers, icon: Users },
            { label: 'Investors', value: metrics.investors, icon: Users },
          ].map((card) => (
            <div key={card.label} className="glass-card rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-500">{card.label}</p>
              <p className="mt-2 text-3xl font-black text-neutral-950 dark:text-white">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-brand-500" size={28} />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          <div className="glass-card overflow-hidden rounded-2xl">
            <div className="max-h-[70vh] overflow-x-auto overflow-y-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-white/80 backdrop-blur-md dark:bg-black/80">
                  <tr className="border-b border-neutral-200/80 text-xs uppercase tracking-wider text-neutral-500 dark:border-white/10">
                    <th className="px-4 py-3 font-bold">Rank</th>
                    <th className="px-4 py-3 font-bold">Name</th>
                    <th className="px-4 py-3 font-bold">Type</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const status = getWaitlistDisplayStatus(row);
                    return (
                      <tr
                        key={row.id}
                        className={cn(
                          'cursor-pointer border-b border-neutral-100 transition hover:bg-brand-500/5 dark:border-white/5',
                          selectedId === row.id && 'bg-brand-500/10'
                        )}
                        onClick={() => setSelectedId(row.id)}
                      >
                        <td className="px-4 py-3 font-bold text-brand-600">#{row.waitlist_rank}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-neutral-950 dark:text-white">{row.name}</p>
                          <p className="text-xs text-neutral-500">{row.email}</p>
                        </td>
                        <td className="px-4 py-3 capitalize">{getWaitlistDisplayUserType(row)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
                              STATUS_STYLES[status]
                            )}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditRow(row);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-500/10 px-3 py-1.5 text-xs font-bold text-brand-600 transition hover:bg-brand-500 hover:text-white dark:border-brand-500/30"
                            aria-label={`Edit ${row.name}`}
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {detail ? (
            <div className="glass-card rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-brand-500">Rank #{detail.waitlist_rank}</p>
                  <h3 className="text-2xl font-black text-neutral-950 dark:text-white">{detail.name}</h3>
                  <p className="text-sm text-neutral-500">{detail.email}</p>
                  <p className="mt-2 text-xs text-neutral-400">
                    Joined {new Date(detail.created_at).toLocaleString('en-GB')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditRow(detail)}
                    className="inline-flex items-center gap-2 rounded-full border border-brand-200 px-4 py-2 text-xs font-bold text-brand-600"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void exportWaitlistProfilePdf(detail)}
                    className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-xs font-bold text-white"
                  >
                    <Download size={14} />
                    PDF
                  </button>
                </div>
              </div>
              <dl className="mt-6 space-y-2 text-sm">
                <div><dt className="text-neutral-500">Phone</dt><dd>{detail.phone ?? 'Not provided'}</dd></div>
                <div><dt className="text-neutral-500">Address</dt><dd>{detail.address ?? 'Not provided'}</dd></div>
                <div><dt className="text-neutral-500">Postal code</dt><dd>{detail.postal_code ?? 'Not provided'}</dd></div>
                <div>
                  <dt className="text-neutral-500">Target Amount</dt>
                  <dd>£{Number(detail.target_amount ?? 0).toLocaleString('en-GB')}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Interest Rate</dt>
                  <dd>{FIXED_INTEREST_RATE_LABEL}</dd>
                </div>
              </dl>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {detail.role === 'investor' ? (
                  <>
                    <div className="rounded-xl border border-brand-200 bg-brand-500/10 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-brand-600">Source of Income</p>
                      <p className="mt-1 text-sm font-semibold">
                        {firstValue(detail.questionnaire_answers, ['Source of Income'])}
                      </p>
                    </div>
                    <div className="rounded-xl border border-brand-200 bg-brand-500/10 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-brand-600">Income Bracket</p>
                      <p className="mt-1 text-sm font-semibold">
                        {firstValue(detail.questionnaire_answers, ['Estimated Annual Income/Package Bracket'])}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl border border-brand-200 bg-brand-500/10 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-brand-600">Source of Income</p>
                      <p className="mt-1 text-sm font-semibold">
                        {detail.borrower_source_of_income ??
                          firstValue(detail.questionnaire_answers, ['Source of Income'])}
                      </p>
                    </div>
                    <div className="rounded-xl border border-brand-200 bg-brand-500/10 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-brand-600">Loan Reason</p>
                      <p className="mt-1 text-sm font-semibold">
                        {firstValue(detail.questionnaire_answers, ['Primary Reason for Loan'])}
                      </p>
                    </div>
                  </>
                )}
              </div>
              {detail.role === 'borrower' && detail.collateral_type ? (
                <CollateralDetailsCard
                  collateralType={detail.collateral_type}
                  collateralValue={detail.collateral_value}
                  collateralDescription={detail.collateral_description}
                  collateralProofUrl={detail.collateral_proof_url}
                  loanAmount={detail.target_amount}
                  onResolveProofUrl={getCollateralProofSignedUrl}
                />
              ) : null}
              <div className="mt-6 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-500">Questionnaire</p>
                {Object.entries(detail.questionnaire_answers)
                  .filter(
                    ([q]) =>
                      !q.startsWith('_') &&
                      q !== 'Current Company/Employer' &&
                      q !== 'Desired Loan Limit Amount (GBP)'
                  )
                  .map(([q, a]) => (
                    <p key={q} className="text-sm">
                      <span className="font-semibold">{q}:</span> {formatQuestionnaireAnswer(a)}
                    </p>
                  ))}
              </div>
            </div>
          ) : (
            <div className="glass-card flex min-h-[200px] items-center justify-center rounded-2xl p-8 text-sm text-neutral-500">
              Select a waitlisted user to view details
            </div>
          )}
        </div>
      )}

      <WaitlistEditModal
        row={editRow}
        open={Boolean(editRow)}
        onClose={() => setEditRow(null)}
        onSaved={handleSaved}
      />
    </div>
  );
}
