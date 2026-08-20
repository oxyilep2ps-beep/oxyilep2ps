import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listInvestorPortfolio } from '@/app/actions/dashboard-loans';
import { createClient } from '@/lib/supabase/server';

export default async function InvestorDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin?redirect=/dashboard/investor');

  const { data: profile } = await supabase.from('profiles').select('role, full_legal_name, is_investor').eq('id', user.id).maybeSingle();
  const { canActAsInvestor } = await import('@/lib/auth/financial-capabilities');
  if (!canActAsInvestor(profile) && profile?.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  // Dual-role anti-arbitrage: block investor portal while borrower loans remain open.
  if (profile?.role !== 'ADMIN') {
    const { checkEligibilityForInvestorUpgrade } = await import('@/app/actions/financial-eligibility');
    const eligibility = await checkEligibilityForInvestorUpgrade();
    if (!eligibility.allowed) {
      redirect('/dashboard/borrower');
    }
  }

  const { rows, error } = await listInvestorPortfolio();

  return (
    <section className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-500">Investor</p>
          <h1 className="mt-1 text-3xl font-black text-neutral-950 dark:text-white">
            {profile?.full_legal_name ?? 'Investor'} dashboard
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            Funded loans and monthly repayment collection status.
          </p>
        </div>
        <Link
          href="/dashboard/marketplace"
          className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-500"
        >
          Browse marketplace
        </Link>
      </div>

      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="border-b border-white/40 px-5 py-4 dark:border-white/10">
          <h2 className="text-lg font-bold text-neutral-950 dark:text-white">Investment Portfolio</h2>
        </div>
        {error ? <p className="px-5 py-6 text-sm text-red-600">{error}</p> : null}
        {!error && rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-neutral-500">No funded investments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50/80 text-xs uppercase tracking-wider text-neutral-500 dark:bg-white/5">
                <tr>
                  <th className="px-5 py-3 font-bold">Borrower Name</th>
                  <th className="px-5 py-3 font-bold">Amount Invested</th>
                  <th className="px-5 py-3 font-bold">Date</th>
                  <th className="px-5 py-3 font-bold">Repayment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40 dark:divide-white/10">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-3 font-semibold">{row.borrower_name}</td>
                    <td className="px-5 py-3 font-semibold">£{row.amount.toLocaleString('en-GB')}</td>
                    <td className="px-5 py-3 text-neutral-600 dark:text-neutral-300">
                      {new Date(row.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-5 py-3">{row.emi_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
