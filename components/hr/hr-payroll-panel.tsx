'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import {
  exportAuditCsv,
  listEmployees,
  listExpenseClaims,
  reviewExpenseClaim,
} from '@/app/actions/hr-suite';
import type { EmployeeHrProfile, ExpenseClaim } from '@/lib/hr/types';
import { estimateUkPayeAnnual, formatGbp, formatGbpPrecise } from '@/lib/hr/types';
import { HrSkeletonCards } from '@/components/hr/hr-skeleton';

export function HrPayrollPanel() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeHrProfile[]>([]);
  const [expenses, setExpenses] = useState<ExpenseClaim[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [e, x] = await Promise.all([listEmployees(), listExpenseClaims()]);
      setEmployees(e);
      setExpenses(x);
      if (!selectedId && e[0]) setSelectedId(e[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(() => employees.find((e) => e.id === selectedId), [employees, selectedId]);
  const paye = useMemo(() => {
    if (!selected) return null;
    const gross = selected.salary_basic_gbp + selected.salary_hra_gbp;
    return estimateUkPayeAnnual(gross);
  }, [selected]);

  if (loading) return <HrSkeletonCards count={3} />;

  return (
    <div className="cms-fade-in space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Payroll £</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            UK salary breakdown, PAYE preview, expenses, audit export.
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border border-brand-300 px-4 py-2 text-xs font-bold text-brand-600"
          onClick={() =>
            startTransition(() => {
              void exportAuditCsv().then((csv) => {
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `oxyile-hr-audit-${Date.now()}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              });
            })
          }
        >
          Export audit CSV
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="glass-card space-y-3 rounded-2xl p-4">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full rounded-xl border border-white/20 bg-black/5 px-3 py-2 text-sm dark:bg-white/5"
        >
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.full_name}
            </option>
          ))}
        </select>
        {selected && paye ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-white/40 p-3 text-sm dark:bg-black/30">
              <p className="text-xs font-bold uppercase text-brand-500">Payslip vault (annual £)</p>
              <ul className="mt-2 space-y-1">
                <li>Basic: {formatGbpPrecise(selected.salary_basic_gbp)}</li>
                <li>Allowance / HRA: {formatGbpPrecise(selected.salary_hra_gbp)}</li>
                <li>Pension: {formatGbpPrecise(selected.salary_pension_gbp)}</li>
                <li>NI (employer bookmark): {formatGbpPrecise(selected.ni_contribution)}</li>
              </ul>
            </div>
            <div className="rounded-xl bg-white/40 p-3 text-sm dark:bg-black/30">
              <p className="text-xs font-bold uppercase text-brand-500">PAYE estimate</p>
              <ul className="mt-2 space-y-1">
                <li>Income tax: {formatGbp(paye.incomeTax)}</li>
                <li>Employee NI: {formatGbp(paye.niEmployee)}</li>
                <li className="font-bold">Est. net: {formatGbp(paye.net)}</li>
              </ul>
              <p className="mt-2 text-[11px] text-neutral-500">Illustrative 2025/26 bands — not official payroll advice.</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">Add employees to view payslips.</p>
        )}
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-brand-500">Expense claims</h3>
        {expenses.length === 0 ? (
          <p className="text-sm text-neutral-500">No claims — use Quick Create (+).</p>
        ) : (
          expenses.map((ex) => (
            <div key={ex.id} className="glass-card flex flex-wrap items-center justify-between gap-2 rounded-2xl p-4">
              <div>
                <p className="font-semibold">
                  {formatGbpPrecise(ex.amount_gbp)} · {ex.category}
                  {ex.requires_exec_signoff ? ' · Exec sign-off' : ''}
                </p>
                <p className="text-xs text-neutral-500">
                  {ex.employee_name} · {ex.status} · {ex.description || '—'}
                </p>
              </div>
              {ex.status === 'pending' ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                    onClick={() => startTransition(() => void reviewExpenseClaim(ex.id, 'approved').then(load))}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white"
                    onClick={() => startTransition(() => void reviewExpenseClaim(ex.id, 'rejected').then(load))}
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
