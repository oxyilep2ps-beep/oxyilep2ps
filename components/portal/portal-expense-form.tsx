'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createExpenseClaim, listEmployees } from '@/app/actions/hr-suite';
import { AuthToast } from '@/components/auth-toast';
import { HR_INPUT_CLASS, HR_SELECT_CLASS } from '@/lib/hr/ui';

export function PortalExpenseForm() {
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
      <h2 className="mt-2 text-xl font-black text-white">Add Expense Claim</h2>
      <p className="mt-1 text-sm text-neutral-400">Log reimbursable spend in £ GBP. Amounts over £500 need exec sign-off.</p>

      <form
        className="mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setError(null);
          startTransition(() => {
            void createExpenseClaim({
              employee_id: String(fd.get('employee_id')),
              amount_gbp: Number(fd.get('amount_gbp')),
              category: String(fd.get('category')),
              description: String(fd.get('description') || ''),
            })
              .then(() => {
                setToast('Expense claim saved.');
                router.push('/hr/payroll');
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
        <input
          name="amount_gbp"
          type="number"
          step="0.01"
          required
          placeholder="Amount £ GBP"
          className={HR_INPUT_CLASS}
        />
        <select name="category" className={HR_SELECT_CLASS}>
          <option value="travel">Travel</option>
          <option value="software">Software</option>
          <option value="meals">Meals</option>
          <option value="equipment">Equipment</option>
          <option value="training">Training</option>
          <option value="other">Other</option>
        </select>
        <input name="description" placeholder="Description" className={HR_INPUT_CLASS} />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-[#F97316] py-2.5 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Submit claim'}
        </button>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </form>
      <AuthToast open={Boolean(toast)} tone="success" message={toast ?? ''} onClose={() => setToast(null)} autoCloseMs={4000} />
    </section>
  );
}
