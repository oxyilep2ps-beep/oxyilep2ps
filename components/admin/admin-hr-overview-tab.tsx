'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import {
  deleteJobPosting,
  getHrExecOverview,
  listHeadcountRequests,
  listReferralBonuses,
  reviewHeadcountRequest,
  type HeadcountRequestRow,
} from '@/app/actions/hr-suite';
import {
  deleteJobApplication,
  listRecentAtsApplications,
  updateJobApplicationStatus,
  type AtsApplication,
} from '@/app/actions/hr-applications';
import type { HrExecOverview } from '@/lib/hr/types';
import { formatGbp } from '@/lib/hr/types';
import { ATS_APPLICATION_STATUSES, normalizeAtsStatus, type AtsApplicationStatus } from '@/lib/hr/ats-application-status';
import { HrSkeletonCards } from '@/components/hr/hr-skeleton';
import { HrJobEditorProvider, subscribeJobPostingCreated, useHrJobEditor } from '@/components/hr/hr-job-editor-provider';
import { HR_SELECT_CLASS } from '@/lib/hr/ui';
import { cn } from '@/lib/utils';

export function AdminHrOverviewTab() {
  return (
    <HrJobEditorProvider>
      <AdminHrOverviewInner />
    </HrJobEditorProvider>
  );
}

function AdminHrOverviewInner() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<HrExecOverview | null>(null);
  const [headcount, setHeadcount] = useState<HeadcountRequestRow[]>([]);
  const [referrals, setReferrals] = useState<Record<string, unknown>[]>([]);
  const [candidates, setCandidates] = useState<AtsApplication[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { openEditJob } = useHrJobEditor();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, h, r, apps] = await Promise.all([
        getHrExecOverview(),
        listHeadcountRequests(),
        listReferralBonuses(),
        listRecentAtsApplications(25).catch(() => [] as AtsApplication[]),
      ]);
      setOverview(o);
      setHeadcount(h);
      setReferrals(r as Record<string, unknown>[]);
      setCandidates(apps);
      setError(null);
      setActionError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load HR overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => subscribeJobPostingCreated(() => void load()), [load]);

  if (loading) return <HrSkeletonCards count={4} />;
  if (error || !overview) {
    return <p className="text-sm text-red-400">{error || 'No data'} — ensure HR migration is applied.</p>;
  }

  const maxSpend = Math.max(...overview.departmentSpend.map((d) => d.spendGbp), 1);
  const pipeline = overview.atsPipeline ?? { total: 0, newAndReviewing: 0, interview: 0, rejected: 0 };

  const setCandidateStatus = (row: AtsApplication, status: AtsApplicationStatus) => {
    const previous = row.status;
    setCandidates((cur) => cur.map((c) => (c.id === row.id ? { ...c, status } : c)));
    startTransition(() => {
      void updateJobApplicationStatus(row.id, status)
        .then(() => void load())
        .catch(() => {
          setCandidates((cur) => cur.map((c) => (c.id === row.id ? { ...c, status: previous } : c)));
        });
    });
  };

  return (
    <div className="cms-fade-in space-y-6 pb-8">
      <div>
        <h2 className="text-xl font-black text-white">Executive HR Overview</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Headcount burn, attrition risk, ATS pipeline, and budget approvals — all figures in £ GBP.
        </p>
      </div>

      {actionError ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{actionError}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Monthly payroll burn" value={formatGbp(overview.monthlyPayrollBurnGbp)} />
        <Card label="Attrition risk score" value={`${overview.attritionRiskScore}/100`} warn={overview.attritionRiskScore > 55} />
        <Card label="FTE / Contractors / Vacancies" value={`${overview.employeeCount} / ${overview.contractorCount} / ${overview.openVacancies}`} />
        <Card label="Referral bonuses pending" value={formatGbp(overview.referralPendingGbp)} />
      </div>

      <section className="space-y-3 rounded-2xl border border-neutral-800 bg-black p-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-[#F97316]">Recruitment & ATS Pipeline</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AtsMetric label="Total Applications" value={pipeline.total} />
          <AtsMetric label="New & Reviewing" value={pipeline.newAndReviewing} />
          <AtsMetric label="In Interview" value={pipeline.interview} />
          <AtsMetric label="Rejected" value={pipeline.rejected} />
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-neutral-800 bg-black p-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-[#F97316]">Recent Candidate Activity</h3>
        {candidates.length === 0 ? (
          <p className="text-sm text-neutral-500">No applications yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-800 text-[11px] font-black uppercase tracking-wider text-neutral-500">
                  <th className="px-2 py-2">Candidate</th>
                  <th className="px-2 py-2">Role</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((row) => (
                  <tr key={row.id} className="border-b border-neutral-900">
                    <td className="px-2 py-3">
                      <p className="font-semibold text-white">{row.candidate_name}</p>
                      <p className="text-xs text-neutral-500">{row.candidate_email}</p>
                    </td>
                    <td className="px-2 py-3 text-neutral-300">{row.role_applied || 'General'}</td>
                    <td className="px-2 py-3">
                      <select
                        disabled={pending}
                        value={normalizeAtsStatus(row.status)}
                        onChange={(e) => setCandidateStatus(row, e.target.value as AtsApplicationStatus)}
                        className={cn(HR_SELECT_CLASS, 'min-w-[8.5rem]')}
                        aria-label={`Status for ${row.candidate_name}`}
                      >
                        {ATS_APPLICATION_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <button
                        type="button"
                        disabled={pending}
                        title="Delete candidate"
                        onClick={() => {
                          const ok = window.confirm(
                            `Delete ${row.candidate_name}? This removes the application and the uploaded resume.`
                          );
                          if (!ok) return;
                          startTransition(() => {
                            void deleteJobApplication(row.id).then((result) => {
                              if (!result?.success) {
                                setActionError(result?.message || 'Could not delete candidate.');
                                return;
                              }
                              void load();
                            });
                          });
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-300 hover:bg-red-500/20 disabled:opacity-60"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="glass-card rounded-2xl p-4">
        <p className="text-xs font-black uppercase tracking-wider text-brand-500">Department cost centres</p>
        <div className="mt-3 space-y-2">
          {overview.departmentSpend.length === 0 ? (
            <p className="text-sm text-neutral-500">No salary data yet.</p>
          ) : (
            overview.departmentSpend.map((d) => (
              <div key={d.department}>
                <div className="mb-1 flex justify-between text-xs font-semibold">
                  <span>{d.department}</span>
                  <span>{formatGbp(d.spendGbp)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-200/60 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${Math.round((d.spendGbp / maxSpend) * 100)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs font-black uppercase tracking-wider text-brand-500">High-performer leaderboard</p>
          <ul className="mt-3 space-y-2">
            {overview.topPerformers.length === 0 ? (
              <li className="text-sm text-neutral-500">No KPI data.</li>
            ) : (
              overview.topPerformers.map((p, i) => (
                <li key={p.name} className="flex justify-between text-sm">
                  <span>
                    #{i + 1} {p.name} · {p.department}
                  </span>
                  <span className="font-bold text-brand-600">{p.kpi}%</span>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs font-black uppercase tracking-wider text-brand-500">Critical pending actions</p>
          <ul className="mt-3 space-y-2">
            {overview.pendingCritical.length === 0 ? (
              <li className="text-sm text-emerald-600">Queue clear.</li>
            ) : (
              overview.pendingCritical.map((c, i) => (
                <li key={`${c.kind}-${i}`} className="text-sm">
                  <span className="font-semibold capitalize">{c.kind}</span>: {c.label}
                  {c.amountGbp != null ? ` · ${formatGbp(c.amountGbp)}` : ''}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-4">
        <p className="text-xs font-black uppercase tracking-wider text-brand-500">Birthdays & work anniversaries</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {overview.upcomingMilestones.length === 0 ? (
            <li className="text-sm text-neutral-500">None in the next 45 days.</li>
          ) : (
            overview.upcomingMilestones.map((m) => (
              <li
                key={`${m.name}-${m.kind}-${m.date}`}
                className="rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-700"
              >
                {m.name} · {m.kind} · {m.date}
              </li>
            ))
          )}
        </ul>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-[#F97316]">
          Headcount budget approvals ({overview.headcountPending} pending)
        </h3>
        {headcount.length === 0 ? (
          <p className="text-sm text-neutral-500">No headcount requests.</p>
        ) : (
          headcount.map((h) => (
            <div key={h.id} className="glass-card flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-black p-4">
              <div>
                <p className="font-semibold text-white">{h.title}</p>
                <p className="text-xs text-neutral-500">
                  {h.department} · Budget {formatGbp(h.salary_budget_gbp)} · {h.status}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {h.job ? (
                  <>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#F97316]/60 px-3 py-1.5 text-xs font-bold text-[#F97316] hover:bg-[#F97316]/10"
                      onClick={() => openEditJob(h.job!)}
                    >
                      <Pencil size={12} /> Edit Job
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/20 disabled:opacity-60"
                      onClick={() => {
                        const ok = window.confirm(
                          `Delete “${h.title}”? This removes the job posting. Linked applications are deleted with it.`
                        );
                        if (!ok) return;
                        startTransition(() => {
                          void deleteJobPosting(h.job!.id).then((result) => {
                            if (!result?.success) {
                              setActionError(result?.message || 'Could not delete job.');
                              return;
                            }
                            void load();
                          });
                        });
                      }}
                    >
                      <Trash2 size={12} /> Delete Job
                    </button>
                  </>
                ) : null}
                {h.status === 'pending' ? (
                  <>
                    <button
                      type="button"
                      disabled={pending}
                      className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                      onClick={() =>
                        startTransition(() => void reviewHeadcountRequest(h.id, 'approved').then(load))
                      }
                    >
                      Approve headcount budget
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white"
                      onClick={() =>
                        startTransition(() => void reviewHeadcountRequest(h.id, 'rejected').then(load))
                      }
                    >
                      Reject
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ))
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-black uppercase tracking-wider text-brand-500">Referral bonuses ({referrals.length})</h3>
        {referrals.length === 0 ? (
          <p className="text-sm text-neutral-500">No referral payouts tracked yet.</p>
        ) : (
          referrals.map((r) => (
            <p key={String(r.id)} className="text-sm">
              {formatGbp(Number(r.amount_gbp))} · {String(r.status)}
            </p>
          ))
        )}
      </section>
    </div>
  );
}

function Card({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="glass-card rounded-2xl bg-black p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#F97316]">{label}</p>
      <p className={`mt-2 text-xl font-black ${warn ? 'text-amber-500' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function AtsMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#F97316]">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}
