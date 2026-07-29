'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import {
  allocateAsset,
  createAccessRequest,
  listAssets,
  listEmployees,
  listLeaveRequests,
  reviewLeaveRequest,
  setEmployeeCompliance,
  startOffboarding,
  upsertEmployee,
} from '@/app/actions/hr-suite';
import type { EmployeeHrProfile, LeaveRequest } from '@/lib/hr/types';
import { formatGbp } from '@/lib/hr/types';
import { HR_INPUT_CLASS, HR_SELECT_CLASS } from '@/lib/hr/ui';
import { HrSkeletonCards } from '@/components/hr/hr-skeleton';
import { cn } from '@/lib/utils';

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

export function HrEmployeesPanel() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeHrProfile[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [assets, setAssets] = useState<unknown[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [e, l, a] = await Promise.all([listEmployees(), listLeaveRequests(), listAssets()]);
      setEmployees(e);
      setLeaves(l);
      setAssets(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const burnoutIds = useMemo(() => {
    const ninetyAgo = Date.now() - 90 * 86400000;
    const recentLeave = new Set(
      leaves
        .filter((l) => l.status === 'approved' && new Date(l.start_date).getTime() > ninetyAgo)
        .map((l) => l.employee_id)
    );
    return new Set(employees.filter((e) => !recentLeave.has(e.id) && e.status === 'active').map((e) => e.id));
  }, [employees, leaves]);

  if (loading) return <HrSkeletonCards count={4} />;

  return (
    <div className="cms-fade-in space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Employees & Leaves</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            FCA onboarding, probation, NDA, burnout flags, assets & access tickets.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-full bg-brand-500 px-4 py-2 text-sm font-bold text-white"
        >
          Add employee
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {showAdd ? (
        <form
          className="glass-card grid gap-2 rounded-2xl p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(() => {
              void upsertEmployee({
                full_name: String(fd.get('full_name')),
                email: String(fd.get('email')),
                department: String(fd.get('department')),
                designation: String(fd.get('designation')),
                employment_type: String(fd.get('employment_type')),
                salary_basic_gbp: Number(fd.get('salary_basic_gbp')),
                salary_hra_gbp: Number(fd.get('salary_hra_gbp') || 0),
                salary_pension_gbp: Number(fd.get('salary_pension_gbp') || 0),
                start_date: String(fd.get('start_date') || ''),
                birthday: String(fd.get('birthday') || ''),
                probation_start_date: String(fd.get('probation_start_date') || ''),
                probation_end_date: String(fd.get('probation_end_date') || ''),
              })
                .then(() => {
                  setShowAdd(false);
                  return load();
                })
                .catch((err) => setError(err instanceof Error ? err.message : 'Save failed'));
            });
          }}
        >
          <input name="full_name" required placeholder="Full name" className={HR_INPUT_CLASS} />
          <input name="email" type="email" required placeholder="Email" className={HR_INPUT_CLASS} />
          <input name="department" defaultValue="Engineering" className={HR_INPUT_CLASS} />
          <input name="designation" defaultValue="Associate" className={HR_INPUT_CLASS} />
          <select name="employment_type" className={HR_SELECT_CLASS}>
            <option value="full_time">Full-time FTE</option>
            <option value="contractor">Contractor</option>
            <option value="part_time">Part-time</option>
            <option value="intern">Intern</option>
          </select>
          <input name="salary_basic_gbp" type="number" required placeholder="Basic £ GBP" className={HR_INPUT_CLASS} />
          <input name="salary_hra_gbp" type="number" placeholder="Allowance £" className={HR_INPUT_CLASS} />
          <input name="salary_pension_gbp" type="number" placeholder="Pension £" className={HR_INPUT_CLASS} />
          <label className="text-xs text-neutral-300">
            Start
            <input name="start_date" type="date" className={cn('mt-1', HR_INPUT_CLASS)} />
          </label>
          <label className="text-xs text-neutral-300">
            Birthday
            <input name="birthday" type="date" className={cn('mt-1', HR_INPUT_CLASS)} />
          </label>
          <label className="text-xs text-neutral-300">
            Probation start
            <input name="probation_start_date" type="date" className={cn('mt-1', HR_INPUT_CLASS)} />
          </label>
          <label className="text-xs text-neutral-300">
            Probation end (30/60/90)
            <input name="probation_end_date" type="date" className={cn('mt-1', HR_INPUT_CLASS)} />
          </label>
          <button type="submit" disabled={pending} className="rounded-full bg-brand-500 py-2 text-sm font-bold text-white sm:col-span-2">
            Save employee
          </button>
        </form>
      ) : null}

      <div className="space-y-3">
        {employees.length === 0 ? (
          <p className="text-sm text-neutral-500">No employees yet.</p>
        ) : (
          employees.map((e) => {
            const untilProbation = daysUntil(e.probation_end_date);
            const probationFlag =
              e.probation_status === 'active' && untilProbation != null && untilProbation <= 14 && untilProbation >= 0;
            return (
              <article key={e.id} className="glass-card rounded-2xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{e.full_name}</p>
                    <p className="text-xs text-neutral-500">
                      {e.designation} · {e.department} · {e.employment_type.replace('_', ' ')} · {formatGbp(e.salary_basic_gbp)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold',
                          e.fca_compliance_trained ? 'bg-emerald-500/15 text-emerald-700' : 'bg-amber-500/15 text-amber-700'
                        )}
                      >
                        FCA {e.fca_compliance_trained ? 'trained' : 'pending'}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold',
                          e.nda_signed ? 'bg-emerald-500/15 text-emerald-700' : 'bg-neutral-500/15'
                        )}
                      >
                        NDA {e.nda_signed ? 'signed' : 'unsigned'}
                      </span>
                      {probationFlag ? (
                        <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                          Probation review in {untilProbation}d
                        </span>
                      ) : null}
                      {burnoutIds.has(e.id) ? (
                        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-700">
                          Burnout risk
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      className="rounded-full border border-brand-300 px-2.5 py-1 text-[11px] font-bold text-brand-600"
                      onClick={() =>
                        startTransition(() => {
                          void setEmployeeCompliance(e.id, { fca_compliance_trained: true }).then(load);
                        })
                      }
                    >
                      Mark FCA
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-brand-300 px-2.5 py-1 text-[11px] font-bold text-brand-600"
                      onClick={() =>
                        startTransition(() => {
                          void setEmployeeCompliance(e.id, { nda_signed: true }).then(load);
                        })
                      }
                    >
                      Mark NDA
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-white/20 px-2.5 py-1 text-[11px] font-bold"
                      onClick={() => {
                        const label = prompt('Asset label (e.g. MacBook Pro 14)');
                        if (!label) return;
                        startTransition(() => {
                          void allocateAsset({
                            employee_id: e.id,
                            asset_type: 'laptop',
                            asset_label: label,
                          }).then(load);
                        });
                      }}
                    >
                      Allocate asset
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-white/20 px-2.5 py-1 text-[11px] font-bold"
                      onClick={() =>
                        startTransition(() => {
                          void createAccessRequest({
                            employee_id: e.id,
                            request_type: 'grant',
                            platform_role: 'ADMIN',
                            reason: 'HR provisioning ticket',
                          }).then(() => alert('Access request sent to tech queue'));
                        })
                      }
                    >
                      Access ticket
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-red-600/90 px-2.5 py-1 text-[11px] font-bold text-white"
                      onClick={() =>
                        startTransition(() => {
                          void startOffboarding(e.id).then(load);
                        })
                      }
                    >
                      Offboard
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-brand-500">Leave approvals</h3>
        {leaves.length === 0 ? (
          <p className="text-sm text-neutral-500">No leave requests.</p>
        ) : (
          leaves.map((l) => (
            <div key={l.id} className="glass-card flex flex-wrap items-center justify-between gap-2 rounded-2xl p-4">
              <div>
                <p className="font-semibold">{l.employee_name || l.employee_id}</p>
                <p className="text-xs text-neutral-500">
                  {l.leave_type} · {l.start_date} → {l.end_date} · {l.status}
                </p>
              </div>
              {l.status === 'pending' ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                    onClick={() => startTransition(() => void reviewLeaveRequest(l.id, 'approved').then(load))}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white"
                    onClick={() => startTransition(() => void reviewLeaveRequest(l.id, 'rejected').then(load))}
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
        <h3 className="text-sm font-black uppercase tracking-wider text-brand-500">Assets ({assets.length})</h3>
        <p className="text-xs text-neutral-500">Company property allocations tracked for offboarding recovery.</p>
      </section>
    </div>
  );
}
