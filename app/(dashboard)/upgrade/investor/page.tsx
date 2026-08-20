import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { checkEligibilityForInvestorUpgrade } from '@/app/actions/financial-eligibility';
import { InvestorUpgradeForm } from '@/components/dashboard/investor-upgrade-form';
import { canActAsInvestor } from '@/lib/auth/financial-capabilities';

export const metadata = { title: 'Upgrade to Investor | Oxyile' };

export default async function InvestorUpgradePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin?redirect=/upgrade/investor');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_investor, is_borrower, status')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || String(profile.status).toUpperCase() !== 'APPROVED') {
    redirect('/pending-verification');
  }

  if (canActAsInvestor(profile) && profile.role !== 'ADMIN') {
    redirect('/dashboard/investor');
  }

  const { data: pendingRequest } = await supabase
    .from('role_upgrade_requests')
    .select('id, created_at')
    .eq('user_id', user.id)
    .eq('requested_role', 'investor')
    .eq('status', 'pending')
    .maybeSingle();

  if (pendingRequest) {
    return (
      <section className="mx-auto min-h-[70dvh] w-full max-w-2xl px-4 py-8 sm:px-6">
        <Link
          href="/dashboard/borrower"
          className="mb-5 inline-flex items-center gap-1.5 text-xs font-bold text-[#F97316] hover:underline"
        >
          <ChevronLeft size={14} />
          Back to Borrower Portal
        </Link>
        <div className="rounded-2xl border border-[#F97316]/35 bg-[#0a0a0a] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#F97316]/15 text-[#F97316]">
            <CheckCircle2 size={28} />
          </div>
          <h1 className="text-xl font-black text-white">Request under review</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-neutral-300">
            Your request is under review by the Admin team. You&apos;ll receive an in-app notification once a decision
            is made.
          </p>
        </div>
      </section>
    );
  }

  const eligibility = await checkEligibilityForInvestorUpgrade();
  if (!eligibility.allowed) {
    redirect('/dashboard/borrower');
  }

  return (
    <section className="mx-auto min-h-[70dvh] w-full max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href="/dashboard/borrower"
        className="mb-5 inline-flex items-center gap-1.5 text-xs font-bold text-[#F97316] hover:underline"
      >
        <ChevronLeft size={14} />
        Back to Borrower Portal
      </Link>
      <InvestorUpgradeForm />
    </section>
  );
}
