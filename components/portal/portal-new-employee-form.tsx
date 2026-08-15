'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { upsertEmployee } from '@/app/actions/hr-suite';
import { AuthToast } from '@/components/auth-toast';
import { HR_INPUT_CLASS, HR_SELECT_CLASS } from '@/lib/hr/ui';
import { cn } from '@/lib/utils';

export function PortalNewEmployeeForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F97316]">Quick Create</p>
      <h2 className="mt-2 text-xl font-black text-white">Add Employee</h2>
      <p className="mt-1 text-sm text-neutral-400">Create an HR profile. Compensation is £ GBP only.</p>

      <form
        className="mt-6 grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setError(null);
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
                setToast('Employee saved.');
                router.push('/hr/employees');
                router.refresh();
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
        {error ? <p className="text-sm text-red-400 sm:col-span-2">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[#F97316] py-2.5 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60 sm:col-span-2"
        >
          {pending ? 'Saving…' : 'Save employee'}
        </button>
      </form>
      <AuthToast open={Boolean(toast)} tone="success" message={toast ?? ''} onClose={() => setToast(null)} autoCloseMs={4000} />
    </section>
  );
}
