import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listBorrowerLoanHistory } from '@/app/actions/dashboard-loans';
import { createClient } from '@/lib/supabase/server';
import { InvestorUpgradeButton } from '@/components/dashboard/investor-upgrade-button';

export default async function BorrowerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin?redirect=/dashboard/borrower');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_legal_name, is_borrower, is_investor')
    .eq('id', user.id)
    .maybeSingle();
  const { canActAsBorrower } = await import('@/lib/auth/financial-capabilities');
  if (!canActAsBorrower(profile) && profile?.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const { rows, error } = await listBorrowerLoanHistory();
  const alreadyInvestor = Boolean(profile?.is_investor) || profile?.role === 'ADMIN';

  return (
    <section className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-500">Borrower</p>
          <h1 className="mt-1 text-3xl font-black text-neutral-950 dark:text-white">
            {profile?.full_legal_name ?? 'Borrower'} dashboard
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">Loan history and guarantor attachment.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <InvestorUpgradeButton alreadyInvestor={alreadyInvestor} />
          <Link
            href="/dashboard/apply"
            className="rounded-full border border-[#F97316]/40 bg-[#F97316]/10 px-5 py-2.5 text-sm font-bold text-[#F97316] hover:bg-[#F97316]/15"
          >
            Apply for a loan
          </Link>
        </div>
      </div>

      {!alreadyInvestor ? <InvestorUpgradeButton alreadyInvestor={false} variant="card" /> : null}

      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="border-b border-white/40 px-5 py-4 dark:border-white/10">
          <h2 className="text-lg font-bold text-neutral-950 dark:text-white">Loan History</h2>
        </div>
        {error ? <p className="px-5 py-6 text-sm text-red-600">{error}</p> : null}
        {!error && rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-neutral-500">No loans yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50/80 text-xs uppercase tracking-wider text-neutral-500 dark:bg-white/5">
                <tr>
                  <th className="px-5 py-3 font-bold">Loan Amount</th>
                  <th className="px-5 py-3 font-bold">Date</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3 font-bold">Guarantor Attached</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40 dark:divide-white/10">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-3 font-semibold">£{row.amount.toLocaleString('en-GB')}</td>
                    <td className="px-5 py-3 text-neutral-600 dark:text-neutral-300">
                      {new Date(row.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-5 py-3 font-semibold">{row.status}</td>
                    <td className="px-5 py-3">{row.guarantor_attached}</td>
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
