'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createLeaveRequest, listEmployees } from '@/app/actions/hr-suite';
import { AuthToast } from '@/components/auth-toast';
import { HR_INPUT_CLASS, HR_SELECT_CLASS } from '@/lib/hr/ui';

export function PortalLeaveForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void listEmployees()
      .then((rows) => setEmployees(rows.map((e) => ({ id: e.id, full_name: e.full_name }))))
      .catch(() => setEmployees([]));
  }, []);

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F97316]">Quick Create</p>
      <h2 className="mt-2 text-xl font-black text-white">Log Employee Leave</h2>
      <p className="mt-1 text-sm text-neutral-400">Record annual, sick, casual, or unpaid leave in £-safe HR records.</p>

      <form
        className="mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setError(null);
          startTransition(() => {
            void createLeaveRequest({
              employee_id: String(fd.get('employee_id')),
              leave_type: String(fd.get('leave_type')),
              start_date: String(fd.get('start_date')),
              end_date: String(fd.get('end_date')),
              reason: String(fd.get('reason') || ''),
            })
              .then(() => {
                setToast('Leave request saved.');
                router.push('/hr/employees');
                router.refresh();
              })
              .catch((err) => setError(err instanceof Error ? err.message : 'Failed — add an employee first'));
          });
        }}
      >
        <select name="employee_id" required className={HR_SELECT_CLASS}>
          <option value="">Select employee</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.full_name}
            </option>
          ))}
        </select>
        <select name="leave_type" className={HR_SELECT_CLASS}>
          <option value="annual">Annual</option>
          <option value="sick">Sick</option>
          <option value="casual">Casual</option>
          <option value="unpaid">Unpaid</option>
        </select>
        <input name="start_date" type="date" required className={HR_INPUT_CLASS} />
        <input name="end_date" type="date" required className={HR_INPUT_CLASS} />
        <input name="reason" placeholder="Reason" className={HR_INPUT_CLASS} />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-[#F97316] py-2.5 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Submit leave'}
        </button>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </form>
      <AuthToast open={Boolean(toast)} tone="success" message={toast ?? ''} onClose={() => setToast(null)} autoCloseMs={4000} />
    </section>
  );
}
