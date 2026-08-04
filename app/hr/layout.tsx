import { HrBottomNav } from '@/components/hr/hr-bottom-nav';
import { Logo } from '@/components/logo';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth/routing';
import { isHrStaffEmail } from '@/lib/auth/role-emails';
import { redirect } from 'next/navigation';

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
      <header className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-950/70 p-5 backdrop-blur dark:border-neutral-800">
        <Logo size="sm" />
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.28em] text-[#F97316]">HR Portal</p>
        <h1 className="mt-2 text-2xl font-black text-white">HR Studio</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-400">
          Enterprise HRMS &amp; ATS for UK FinTech — all money in £ GBP. Use the bottom bar to move between modules.
        </p>
      </header>
      {children}
      <HrBottomNav />
    </div>
  );
}
