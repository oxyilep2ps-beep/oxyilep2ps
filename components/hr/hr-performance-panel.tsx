'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import {
  addPeerFeedback,
  createKpiGoal,
  listEmployees,
  listGrievances,
  listKpiGoals,
  listOffboarding,
  listPeerFeedback,
  setEmployeeCompliance,
  submitGrievance,
  updateKpiProgress,
  updateOffboarding,
} from '@/app/actions/hr-suite';
import { formatGbp } from '@/lib/hr/types';
import { HrSkeletonCards } from '@/components/hr/hr-skeleton';

export function HrPerformancePanel() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<{ id: string; full_name: string; kpi_score: number; salary_basic_gbp: number }[]>([]);
  const [goals, setGoals] = useState<Record<string, unknown>[]>([]);
  const [feedback, setFeedback] = useState<Record<string, unknown>[]>([]);
  const [grievances, setGrievances] = useState<Record<string, unknown>[]>([]);
  const [offboarding, setOffboarding] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [e, g, f, gr, o] = await Promise.all([
        listEmployees(),
        listKpiGoals(),
        listPeerFeedback(),
        listGrievances(),
        listOffboarding(),
      ]);
      setEmployees(
        e.map((x) => ({
          id: x.id,
          full_name: x.full_name,
          kpi_score: x.kpi_score,
          salary_basic_gbp: x.salary_basic_gbp,
        }))
      );
      setGoals(g as Record<string, unknown>[]);
      setFeedback(f as Record<string, unknown>[]);
      setGrievances(gr as Record<string, unknown>[]);
      setOffboarding(o as Record<string, unknown>[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <HrSkeletonCards count={3} />;

  return (
    <div className="cms-fade-in space-y-6">
      <div>
        <h2 className="text-xl font-black">Performance & Compliance</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          OKRs, 360 feedback, £ bonus calculator, grievance box, offboarding.
        </p>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="glass-card space-y-3 rounded-2xl p-4">
        <p className="text-xs font-black uppercase tracking-wider text-brand-500">Bonus calculator (£)</p>
        {employees.slice(0, 8).map((e) => {
          const bonus = Math.round((e.salary_basic_gbp * (e.kpi_score / 100) * 0.1) / 12);
          return (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                {e.full_name} · KPI {e.kpi_score}%
              </span>
              <span className="font-bold text-brand-600">{formatGbp(bonus)}/mo incentive</span>
              <input
                type="range"
                min={0}
                max={100}
                defaultValue={e.kpi_score}
                onMouseUp={(ev) => {
                  const v = Number((ev.target as HTMLInputElement).value);
                  startTransition(() => {
                    void setEmployeeCompliance(e.id, { kpi_score: v }).then(load);
                  });
                }}
                className="w-full sm:w-40"
              />
            </div>
          );
        })}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-brand-500">Quarterly KPIs / OKRs</h3>
        <form
          className="glass-card grid gap-2 rounded-2xl p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(() => {
              void createKpiGoal({
                employee_id: String(fd.get('employee_id')),
                quarter: String(fd.get('quarter')),
                title: String(fd.get('title')),
                description: String(fd.get('description') || ''),
              }).then(load);
            });
          }}
        >
          <select name="employee_id" required className="rounded-xl border border-white/20 bg-black/5 px-3 py-2 text-sm dark:bg-white/5">
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name}
              </option>
            ))}
          </select>
          <input name="quarter" defaultValue="2026-Q3" className="rounded-xl border border-white/20 bg-black/5 px-3 py-2 text-sm dark:bg-white/5" />
          <input name="title" required placeholder="Goal title" className="rounded-xl border border-white/20 bg-black/5 px-3 py-2 text-sm dark:bg-white/5 sm:col-span-2" />
          <input name="description" placeholder="Description" className="rounded-xl border border-white/20 bg-black/5 px-3 py-2 text-sm dark:bg-white/5 sm:col-span-2" />
          <button type="submit" disabled={pending} className="rounded-full bg-brand-500 py-2 text-sm font-bold text-white sm:col-span-2">
            Add goal
          </button>
        </form>
        {goals.map((g) => {
          const emp = g.employee_hr_profiles as { full_name?: string } | null;
          const pct = Number(g.progress_pct ?? 0);
          return (
            <div key={String(g.id)} className="glass-card rounded-2xl p-4">
              <p className="font-semibold">
                {String(g.title)} · {emp?.full_name} · {String(g.quarter)}
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200/60 dark:bg-white/10">
                <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
              </div>
              <input
                type="range"
                min={0}
                max={100}
                defaultValue={pct}
                className="mt-2 w-full"
                onMouseUp={(ev) => {
                  const v = Number((ev.target as HTMLInputElement).value);
                  startTransition(() => void updateKpiProgress(String(g.id), v).then(load));
                }}
              />
            </div>
          );
        })}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-brand-500">360° peer feedback</h3>
        <form
          className="glass-card grid gap-2 rounded-2xl p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(() => {
              void addPeerFeedback({
                employee_id: String(fd.get('employee_id')),
                from_name: String(fd.get('from_name')),
                rating: Number(fd.get('rating')),
                feedback: String(fd.get('feedback')),
              }).then(() => {
                e.currentTarget.reset();
                return load();
              });
            });
          }}
        >
          <select name="employee_id" required className="rounded-xl border border-white/20 bg-black/5 px-3 py-2 text-sm dark:bg-white/5">
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name}
              </option>
            ))}
          </select>
          <input name="from_name" required placeholder="From (manager/peer)" className="rounded-xl border border-white/20 bg-black/5 px-3 py-2 text-sm dark:bg-white/5" />
          <input name="rating" type="number" min={1} max={5} defaultValue={4} className="rounded-xl border border-white/20 bg-black/5 px-3 py-2 text-sm dark:bg-white/5" />
          <textarea name="feedback" required rows={2} placeholder="Constructive feedback" className="rounded-xl border border-white/20 bg-black/5 px-3 py-2 text-sm dark:bg-white/5" />
          <button type="submit" className="rounded-full bg-brand-500 py-2 text-sm font-bold text-white">
            Log feedback
          </button>
        </form>
        {feedback.slice(0, 5).map((f) => {
          const emp = f.employee_hr_profiles as { full_name?: string } | null;
          return (
            <p key={String(f.id)} className="text-sm text-neutral-600 dark:text-neutral-300">
              <strong>{emp?.full_name}</strong> ← {String(f.from_name)} ({String(f.rating)}/5): {String(f.feedback)}
            </p>
          );
        })}
      </section>

      <section className="glass-card space-y-2 rounded-2xl p-4">
        <p className="text-xs font-black uppercase tracking-wider text-brand-500">Anonymous grievance / whistleblower</p>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(() => {
              void submitGrievance({
                subject: String(fd.get('subject')),
                body: String(fd.get('body')),
              }).then(() => {
                e.currentTarget.reset();
                alert('Submitted anonymously');
                return load();
              });
            });
          }}
        >
          <input name="subject" required placeholder="Subject" className="w-full rounded-xl border border-white/20 bg-black/5 px-3 py-2 text-sm dark:bg-white/5" />
          <textarea name="body" required rows={3} placeholder="Details (stored without your identity)" className="w-full rounded-xl border border-white/20 bg-black/5 px-3 py-2 text-sm dark:bg-white/5" />
          <button type="submit" className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-bold text-white dark:bg-white dark:text-neutral-900">
            Submit securely
          </button>
        </form>
        <p className="text-xs text-neutral-500">{grievances.length} open/tracked reports in vault.</p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-black uppercase tracking-wider text-brand-500">Offboarding</h3>
        {offboarding.map((o) => {
          const emp = o.employee_hr_profiles as { full_name?: string } | null;
          return (
            <div key={String(o.id)} className="glass-card rounded-2xl p-4 text-sm">
              <p className="font-semibold">{emp?.full_name}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full border border-white/20 px-2.5 py-1 text-[11px] font-bold"
                  onClick={() =>
                    startTransition(() => void updateOffboarding(String(o.id), { access_revoked: true }).then(load))
                  }
                >
                  {o.access_revoked ? 'Access revoked ✓' : 'Revoke access'}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-white/20 px-2.5 py-1 text-[11px] font-bold"
                  onClick={() =>
                    startTransition(() => void updateOffboarding(String(o.id), { assets_collected: true }).then(load))
                  }
                >
                  {o.assets_collected ? 'Assets collected ✓' : 'Collect assets'}
                </button>
                <button
                  type="button"
                  className="rounded-full bg-brand-500 px-2.5 py-1 text-[11px] font-bold text-white"
                  onClick={() => {
                    const notes = prompt('Exit interview notes');
                    if (notes == null) return;
                    startTransition(() =>
                      void updateOffboarding(String(o.id), {
                        exit_interview_notes: notes,
                        status: 'completed',
                      }).then(load)
                    );
                  }}
                >
                  Complete exit
                </button>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
