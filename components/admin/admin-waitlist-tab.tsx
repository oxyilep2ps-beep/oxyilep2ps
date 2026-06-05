'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Loader2, Users } from 'lucide-react';
import {
  getCollateralProofSignedUrl,
  getWaitlistMetrics,
  getWaitlistUser,
  listWaitlistUsers,
  type WaitlistMetrics,
  type WaitlistRow,
} from '@/app/actions/admin-waitlist';
import { CollateralDetailsCard } from '@/components/admin/collateral-details-card';
import { exportWaitlistProfilePdf } from '@/lib/pdf/waitlist-profile-pdf';

function firstValue(record: Record<string, string | boolean>, keys: string[]): string {
  for (const key of keys) {
    if (key in record) {
      const value = record[key];
      return typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
    }
  }
  return 'Not provided';
}

export function AdminWaitlistTab() {
  const [rows, setRows] = useState<WaitlistRow[]>([]);
  const [metrics, setMetrics] = useState<WaitlistMetrics | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WaitlistRow | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-neutral-950 dark:text-white">Waitlisted Users</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Early-access signups with queue rank and questionnaire responses.
        </p>
      </div>

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
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="glass-card max-h-[70vh] overflow-y-auto rounded-2xl p-3">
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedId(row.id)}
                className={`mb-2 w-full rounded-xl border p-4 text-left transition ${
                  selectedId === row.id
                    ? 'border-brand-400 bg-brand-500/10'
                    : 'border-white/50 bg-white/40 hover:border-brand-300 dark:border-white/10 dark:bg-black/30'
                }`}
              >
                <p className="font-bold text-brand-600">#{row.waitlist_rank}</p>
                <p className="font-semibold text-neutral-950 dark:text-white">{row.name}</p>
                <p className="text-xs text-neutral-500">{row.email}</p>
                <p className="mt-1 text-xs capitalize text-neutral-400">{row.role}</p>
              </button>
            ))}
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
                <button
                  type="button"
                  onClick={() => void exportWaitlistProfilePdf(detail)}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-xs font-bold text-white"
                >
                  <Download size={14} />
                  Download Waitlist Profile PDF
                </button>
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
                  <dt className="text-neutral-500">Expected Interest Rate</dt>
                  <dd>{Number(detail.expected_interest_rate ?? 0).toLocaleString('en-GB')}%</dd>
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
                      q !== 'Current Company/Employer' &&
                      q !== 'Desired Loan Limit Amount (GBP)'
                  )
                  .map(([q, a]) => (
                    <p key={q} className="text-sm">
                      <span className="font-semibold">{q}:</span>{' '}
                      {typeof a === 'boolean' ? (a ? 'Yes' : 'No') : String(a)}
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
    </div>
  );
}
