import { redirect } from 'next/navigation';
import { MarketplaceGrid } from '@/components/dashboard/marketplace-grid';
import { requireApprovedUser } from '@/lib/auth/require-approved';
import { FIXED_INTEREST_RATE_LABEL } from '@/lib/platform/constants';

export default async function MarketplacePage() {
  const { profile } = await requireApprovedUser();

  if (profile.role !== 'INVESTOR') {
    redirect('/dashboard/apply');
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-500">Investor</p>
        <h1 className="mt-2 text-2xl font-black text-neutral-950 dark:text-white sm:text-3xl">
          Available Opportunities
        </h1>
        <p className="mt-2 text-sm leading-7 text-neutral-600 dark:text-neutral-300">
          Browse collateral-backed borrower applications. {FIXED_INTEREST_RATE_LABEL} on all marketplace loans.
        </p>
      </div>
      <MarketplaceGrid />
    </section>
  );
}
