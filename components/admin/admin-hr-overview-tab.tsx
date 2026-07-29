'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import {
  getHrExecOverview,
  listHeadcountRequests,
  listReferralBonuses,
  reviewHeadcountRequest,
} from '@/app/actions/hr-suite';
import type { HrExecOverview } from '@/lib/hr/types';
import { formatGbp } from '@/lib/hr/types';
import { HrSkeletonCards } from '@/components/hr/hr-skeleton';

export function AdminHrOverviewTab() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<HrExecOverview | null>(null);
  const [headcount, setHeadcount] = useState<Record<string, unknown>[]>([]);
  const [referrals, setReferrals] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, h, r] = await Promise.all([getHrExecOverview(), listHeadcountRequests(), listReferralBonuses()]);
      setOverview(o);
      setHeadcount(h as Record<string, unknown>[]);
      setReferrals(r as Record<string, unknown>[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load HR overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <HrSkeletonCards count={4} />;
  if (error || !overview) {
    return (
      <p className="text-sm text-red-600">
        {error || 'No data'} — ensure HR migration is applied.
      </p>
    );
  }

  const maxSpend = Math.max(...overview.departmentSpend.map((d) => d.spendGbp), 1);

  return (
    <div className="cms-fade-in space-y-6 pb-8">
      <div>
        <h2 className="text-xl font-black">Executive HR Overview</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Headcount burn, attrition risk, budget approvals — all figures in £ GBP.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Monthly payroll burn" value={formatGbp(overview.monthlyPayrollBurnGbp)} />
        <Card label="Attrition risk score" value={`${overview.attritionRiskScore}/100`} warn={overview.attritionRiskScore > 55} />
        <Card label="FTE / Contractors / Vacancies" value={`${overview.employeeCount} / ${overview.contractorCount} / ${overview.openVacancies}`} />
        <Card label="Referral bonuses pending" value={formatGbp(overview.referralPendingGbp)} />
      </div>

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
        <h3 className="text-sm font-black uppercase tracking-wider text-brand-500">
          Headcount budget approvals ({overview.headcountPending} pending)
        </h3>
        {headcount.length === 0 ? (
          <p className="text-sm text-neutral-500">No headcount requests.</p>
        ) : (
          headcount.map((h) => (
            <div key={String(h.id)} className="glass-card flex flex-wrap items-center justify-between gap-2 rounded-2xl p-4">
              <div>
                <p className="font-semibold">{String(h.title)}</p>
                <p className="text-xs text-neutral-500">
                  {String(h.department)} · Budget {formatGbp(Number(h.salary_budget_gbp))} · {String(h.status)}
                </p>
              </div>
              {h.status === 'pending' ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                    onClick={() =>
                      startTransition(() => void reviewHeadcountRequest(String(h.id), 'approved').then(load))
                    }
                  >
                    Approve headcount budget
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white"
                    onClick={() =>
                      startTransition(() => void reviewHeadcountRequest(String(h.id), 'rejected').then(load))
                    }
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-black uppercase tracking-wider text-brand-500">
          Referral bonuses ({referrals.length})
        </h3>
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
    <div className="glass-card rounded-2xl p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-brand-500">{label}</p>
      <p className={`mt-2 text-xl font-black ${warn ? 'text-amber-600' : 'text-neutral-950 dark:text-white'}`}>
        {value}
      </p>
    </div>
  );
}
