import { HrBottomNav } from '@/components/hr/hr-bottom-nav';
import { Logo } from '@/components/logo';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth/routing';
import { isHrStaffEmail } from '@/lib/auth/role-emails';
import { redirect } from 'next/navigation';
import Link from 'next/link';

const links = [
  { href: '/hr', label: 'Overview' },
  { href: '/hr/recruitment', label: 'ATS Recruitment' },
  { href: '/hr/employees', label: 'Employees & Leaves' },
  { href: '/hr/attendance', label: 'Attendance' },
  { href: '/hr/payroll', label: 'Payroll £' },
  { href: '/hr/performance', label: 'Performance' },
  { href: '/hr/guide', label: 'HR Guide' },
  { href: '/hr/settings', label: 'Settings' },
];

export default async function HrLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin?redirect=/hr');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();

  if (!isAdminEmail(user.email) && !isHrStaffEmail(user.email) && profile?.role !== 'HR' && profile?.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 pb-28 pt-8 sm:px-6">
      <header className="glass-card mb-8 rounded-2xl p-6">
        <Logo size="sm" />
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.28em] text-brand-500">HR Portal</p>
        <h1 className="mt-2 text-2xl font-black text-neutral-950 dark:text-white">HR Studio</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Enterprise HRMS & ATS for UK FinTech — all money in £ GBP.
        </p>
        <nav className="mt-6 flex flex-wrap gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-white/50 bg-white/50 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-white/10 dark:bg-black/30 dark:text-neutral-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
      <HrBottomNav />
    </div>
  );
}
