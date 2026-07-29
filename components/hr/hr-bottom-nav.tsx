'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  FileSpreadsheet,
  Home,
  Plus,
  Settings,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { createExpenseClaim, createLeaveRequest, listEmployees } from '@/app/actions/hr-suite';
import { HR_INPUT_CLASS, HR_SELECT_CLASS } from '@/lib/hr/ui';
import { cn } from '@/lib/utils';

const leftItems = [
  { href: '/hr', label: 'Overview', icon: Home, exact: true },
  { href: '/hr/recruitment', label: 'ATS', icon: BriefcaseBusiness },
] as const;

const rightItems = [
  { href: '/hr/employees', label: 'People', icon: Users },
  { href: '/hr/payroll', label: 'Payroll £', icon: Wallet },
  { href: '/hr/guide', label: 'Guide', icon: BookOpen },
  { href: '/hr/settings', label: 'Settings', icon: Settings },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact || href === '/hr') return pathname === '/hr' || pathname === '/hr/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  icon: Icon,
  exact,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, href, exact);
  return (
    <Link
      href={href}
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-0.5 py-1.5 text-[8px] font-semibold sm:text-[9px]',
        active ? 'text-brand-500' : 'text-neutral-500 dark:text-neutral-400'
      )}
    >
      <Icon size={17} strokeWidth={active ? 2.5 : 2} />
      <span className="truncate text-center leading-tight">{label}</span>
    </Link>
  );
}

type QuickMode = 'leave' | 'expense' | null;

export function HrBottomNav() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<QuickMode>(null);
  const [pending, startTransition] = useTransition();
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPtr = (e: MouseEvent | TouchEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
        setMode(null);
      }
    };
    document.addEventListener('mousedown', onPtr);
    return () => document.removeEventListener('mousedown', onPtr);
  }, [open]);

  useEffect(() => {
    if (!mode) return;
    void listEmployees()
      .then((rows) => setEmployees(rows.map((e) => ({ id: e.id, full_name: e.full_name }))))
      .catch(() => setEmployees([]));
  }, [mode]);

  const employeeOptions = useMemo(() => employees, [employees]);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/20 bg-white/75 pb-[calc(0.4rem+env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md dark:border-white/10 dark:bg-white/10"
      aria-label="HR navigation"
    >
      <div className="relative mx-auto flex max-w-2xl items-end justify-between gap-0.5 px-1.5 sm:px-3">
        {leftItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}

        <div ref={ref} className="relative flex w-14 shrink-0 flex-col items-center sm:w-16">
          {open ? (
            <div className="absolute bottom-[calc(100%+0.65rem)] left-1/2 z-50 w-[min(92vw,20rem)] -translate-x-1/2 overflow-hidden rounded-2xl border border-white/40 bg-white/95 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-neutral-950/95">
              {!mode ? (
                <>
                  <p className="border-b border-black/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-brand-500 dark:border-white/10">
                    Quick Create
                  </p>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm font-semibold hover:bg-orange-500/20"
                    onClick={() => {
                      setOpen(false);
                      router.push('/hr/recruitment?new=1');
                    }}
                  >
                    <BriefcaseBusiness size={16} className="text-brand-600" /> Post New Job (£ GBP)
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 border-t border-black/5 px-3 py-3 text-left text-sm font-semibold hover:bg-orange-500/20 dark:border-white/10"
                    onClick={() => setMode('leave')}
                  >
                    <CalendarDays size={16} className="text-brand-600" /> Log Employee Leave
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 border-t border-black/5 px-3 py-3 text-left text-sm font-semibold hover:bg-orange-500/20 dark:border-white/10"
                    onClick={() => setMode('expense')}
                  >
                    <FileSpreadsheet size={16} className="text-brand-600" /> Add Expense Claim
                  </button>
                </>
              ) : (
                <QuickForm
                  mode={mode}
                  employees={employeeOptions}
                  pending={pending}
                  onBack={() => setMode(null)}
                  onDone={(path) => {
                    setOpen(false);
                    setMode(null);
                    setMsg(null);
                    router.push(path);
                    router.refresh();
                  }}
                  onError={setMsg}
                  startTransition={startTransition}
                />
              )}
              {msg ? <p className="border-t border-red-500/20 px-3 py-2 text-[11px] text-red-600">{msg}</p> : null}
            </div>
          ) : null}

          <button
            type="button"
            aria-label="Quick create"
            onClick={() => {
              setOpen((v) => !v);
              setMode(null);
              setMsg(null);
            }}
            className={cn(
              '-mt-5 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg shadow-orange-500/35 transition hover:scale-105',
              open ? 'bg-neutral-800' : 'bg-orange-500 hover:bg-orange-600'
            )}
          >
            {open ? <X size={22} /> : <Plus size={24} strokeWidth={2.5} />}
          </button>
          <span className="mt-0.5 text-[9px] font-bold text-orange-600">Create</span>
        </div>

        {rightItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </div>
    </nav>
  );
}

function QuickForm({
  mode,
  employees,
  pending,
  onBack,
  onDone,
  onError,
  startTransition,
}: {
  mode: 'leave' | 'expense';
  employees: { id: string; full_name: string }[];
  pending: boolean;
  onBack: () => void;
  onDone: (path: string) => void;
  onError: (m: string) => void;
  startTransition: (fn: () => void) => void;
}) {
  if (mode === 'leave') {
    return (
      <form
        className="space-y-2 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => {
            void createLeaveRequest({
              employee_id: String(fd.get('employee_id')),
              leave_type: String(fd.get('leave_type')),
              start_date: String(fd.get('start_date')),
              end_date: String(fd.get('end_date')),
              reason: String(fd.get('reason') || ''),
            })
              .then(() => onDone('/hr/employees'))
              .catch((err) => onError(err instanceof Error ? err.message : 'Failed — add an employee first'));
          });
        }}
      >
        <button type="button" className="text-xs font-bold text-brand-600" onClick={onBack}>
          ← Back
        </button>
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
        <button type="submit" disabled={pending} className="w-full rounded-full bg-brand-500 py-2 text-sm font-bold text-white disabled:opacity-60">
          Submit leave
        </button>
      </form>
    );
  }

  return (
    <form
      className="space-y-2 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => {
          void createExpenseClaim({
            employee_id: String(fd.get('employee_id')),
            amount_gbp: Number(fd.get('amount_gbp')),
            category: String(fd.get('category')),
            description: String(fd.get('description') || ''),
          })
            .then(() => onDone('/hr/payroll'))
            .catch((err) => onError(err instanceof Error ? err.message : 'Failed — add an employee first'));
        });
      }}
    >
      <button type="button" className="text-xs font-bold text-brand-600" onClick={onBack}>
        ← Back
      </button>
      <select name="employee_id" required className={HR_SELECT_CLASS}>
        <option value="">Select employee</option>
        {employees.map((e) => (
          <option key={e.id} value={e.id}>
            {e.full_name}
          </option>
        ))}
      </select>
      <input name="amount_gbp" type="number" step="0.01" required placeholder="Amount £ GBP" className={HR_INPUT_CLASS} />
      <select name="category" className={HR_SELECT_CLASS}>
        <option value="travel">Travel</option>
        <option value="software">Software</option>
        <option value="meals">Meals</option>
        <option value="equipment">Equipment</option>
        <option value="training">Training</option>
        <option value="other">Other</option>
      </select>
      <input name="description" placeholder="Description" className={HR_INPUT_CLASS} />
      <button type="submit" disabled={pending} className="w-full rounded-full bg-brand-500 py-2 text-sm font-bold text-white disabled:opacity-60">
        Submit claim
      </button>
    </form>
  );
}
