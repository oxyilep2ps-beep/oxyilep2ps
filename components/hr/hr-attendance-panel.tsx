'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import {
  listAttendance,
  listEmployees,
  listOvertime,
  logAttendance,
  logOvertime,
  signOffOvertime,
} from '@/app/actions/hr-suite';
import { UK_BANK_HOLIDAYS_2026 } from '@/lib/hr/types';
import { HR_INPUT_CLASS, HR_SELECT_CLASS } from '@/lib/hr/ui';
import { HrSkeletonCards } from '@/components/hr/hr-skeleton';
import { cn } from '@/lib/utils';

export function HrAttendancePanel() {
  const [loading, setLoading] = useState(true);
  const [showHolidays, setShowHolidays] = useState(true);
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [attendance, setAttendance] = useState<Record<string, unknown>[]>([]);
  const [overtime, setOvertime] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [employeeId, setEmployeeId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [e, a, o] = await Promise.all([listEmployees(), listAttendance(), listOvertime()]);
      setEmployees(e.map((x) => ({ id: x.id, full_name: x.full_name })));
      setAttendance(a as Record<string, unknown>[]);
      setOvertime(o as Record<string, unknown>[]);
      if (!employeeId && e[0]) setEmployeeId(e[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <HrSkeletonCards count={3} />;

  return (
    <div className="cms-fade-in space-y-6">
      <div>
        <h2 className="text-xl font-black">Attendance & Overtime</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Remote check-in/out, UK bank holidays, overtime sign-off for payroll.
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="glass-card flex flex-wrap items-center gap-2 rounded-2xl p-4">
        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className={HR_SELECT_CLASS}
        >
          <option value="">Select employee</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.full_name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!employeeId || pending}
          className="rounded-full bg-brand-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
          onClick={() =>
            startTransition(() => {
              void logAttendance({
                employee_id: employeeId,
                action: 'check_in',
                location_tag: 'Remote UK',
                ip_address: 'client',
              }).then(load);
            })
          }
        >
          Check in
        </button>
        <button
          type="button"
          disabled={!employeeId || pending}
          className="rounded-full border border-brand-300 px-3 py-2 text-xs font-bold text-brand-600 disabled:opacity-50"
          onClick={() =>
            startTransition(() => {
              void logAttendance({ employee_id: employeeId, action: 'check_out' }).then(load);
            })
          }
        >
          Check out
        </button>
      </div>

      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-wider text-brand-500">UK bank holidays 2026</p>
          <button
            type="button"
            className="text-xs font-bold text-brand-600"
            onClick={() => setShowHolidays((v) => !v)}
          >
            {showHolidays ? 'Hide' : 'Show'}
          </button>
        </div>
        {showHolidays ? (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {UK_BANK_HOLIDAYS_2026.map((h) => (
              <li key={h.date} className="rounded-xl bg-white/40 px-3 py-2 text-sm dark:bg-black/30">
                <span className="font-semibold">{h.name}</span>
                <span className="ml-2 text-xs text-neutral-500">{h.date}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-black uppercase tracking-wider text-brand-500">Recent attendance</h3>
        {attendance.length === 0 ? (
          <p className="text-sm text-neutral-500">No logs yet.</p>
        ) : (
          attendance.slice(0, 20).map((row) => {
            const emp = row.employee_hr_profiles as { full_name?: string } | null;
            return (
              <div key={String(row.id)} className="glass-card rounded-xl p-3 text-sm">
                <p className="font-semibold">{emp?.full_name || 'Employee'}</p>
                <p className="text-xs text-neutral-500">
                  In {new Date(String(row.check_in_at)).toLocaleString('en-GB')}
                  {row.check_out_at ? ` · Out ${new Date(String(row.check_out_at)).toLocaleString('en-GB')}` : ' · Open'}
                  {row.location_tag ? ` · ${String(row.location_tag)}` : ''}
                </p>
              </div>
            );
          })
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-brand-500">Overtime</h3>
        <form
          className="glass-card flex flex-wrap gap-2 rounded-2xl p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(() => {
              void logOvertime({
                employee_id: String(fd.get('employee_id')),
                work_date: String(fd.get('work_date')),
                hours: Number(fd.get('hours')),
                notes: String(fd.get('notes') || ''),
              }).then(load);
            });
          }}
        >
          <select name="employee_id" required className={HR_SELECT_CLASS}>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name}
              </option>
            ))}
          </select>
          <input name="work_date" type="date" required className={HR_INPUT_CLASS} />
          <input name="hours" type="number" step="0.25" required placeholder="Hours" className={cn('w-24', HR_INPUT_CLASS)} />
          <input name="notes" placeholder="Notes" className={cn('min-w-[8rem] flex-1', HR_INPUT_CLASS)} />
          <button type="submit" className="rounded-full bg-brand-500 px-3 py-2 text-xs font-bold text-white">
            Log OT
          </button>
        </form>
        {overtime.map((row) => {
          const emp = row.employee_hr_profiles as { full_name?: string } | null;
          return (
            <div key={String(row.id)} className="glass-card flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 text-sm">
              <div>
                <p className="font-semibold">{emp?.full_name}</p>
                <p className="text-xs text-neutral-500">
                  {String(row.work_date)} · {String(row.hours)}h · {row.manager_signed_off ? 'Signed off' : 'Awaiting sign-off'}
                </p>
              </div>
              {!row.manager_signed_off ? (
                <button
                  type="button"
                  className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                  onClick={() => startTransition(() => void signOffOvertime(String(row.id)).then(load))}
                >
                  Manager sign-off
                </button>
              ) : null}
            </div>
          );
        })}
      </section>
    </div>
  );
}
