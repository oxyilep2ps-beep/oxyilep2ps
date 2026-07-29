'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BriefcaseBusiness,
  CalendarDays,
  Gauge,
  Users,
  Wallet,
} from 'lucide-react';
import { getHrExecOverview } from '@/app/actions/hr-suite';
import type { HrExecOverview } from '@/lib/hr/types';
import { formatGbp } from '@/lib/hr/types';
import { HrSkeletonCards } from '@/components/hr/hr-skeleton';

const tiles = [
  { href: '/hr/recruitment', label: 'ATS Recruitment', desc: 'Kanban hiring pipeline', icon: BriefcaseBusiness },
  { href: '/hr/employees', label: 'Employees & Leaves', desc: 'People, compliance, leave', icon: Users },
  { href: '/hr/attendance', label: 'Attendance', desc: 'Check-in, OT, UK holidays', icon: CalendarDays },
  { href: '/hr/payroll', label: 'Payroll £', desc: 'Payslips, PAYE, expenses', icon: Wallet },
  { href: '/hr/performance', label: 'Performance', desc: 'OKRs, feedback, offboarding', icon: Gauge },
  { href: '/hr/guide', label: 'HR Studio Guide', desc: 'All 40 features explained', icon: Gauge },
];

export function HrOverviewDashboard() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<HrExecOverview | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOverview(await getHrExecOverview());
    } catch {
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="cms-fade-in space-y-6">
      <div className="glass-card rounded-2xl p-6">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-500">HRMS Command</p>
        <h2 className="mt-2 text-2xl font-black text-neutral-950 dark:text-white">Enterprise People Ops</h2>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600 dark:text-neutral-300">
          UK FinTech ATS + HRMS — salaries, expenses, and incentives in £ GBP. Use the orange + button for
          instant job, leave, or expense create.
        </p>
      </div>

      {loading ? (
        <HrSkeletonCards count={3} />
      ) : overview ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Monthly payroll burn" value={formatGbp(overview.monthlyPayrollBurnGbp)} />
          <Stat label="FTE employees" value={String(overview.employeeCount)} />
          <Stat label="Contractors" value={String(overview.contractorCount)} />
          <Stat label="Open vacancies" value={String(overview.openVacancies)} />
        </div>
      ) : (
        <p className="text-sm text-neutral-500">
          Apply migration <code className="text-xs">20250729120000_add_enterprise_hr_portal_suite.sql</code> to
          unlock live metrics.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(({ href, label, desc, icon: Icon }) => (
          <Link key={href} href={href} className="glass-card rounded-2xl p-5 transition hover:border-brand-300">
            <Icon className="text-brand-500" size={22} />
            <p className="mt-3 font-bold text-neutral-950 dark:text-white">{label}</p>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-brand-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-neutral-950 dark:text-white">{value}</p>
    </div>
  );
}
