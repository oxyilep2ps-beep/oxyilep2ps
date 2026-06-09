import { redirect } from 'next/navigation';
import { ApplyLoanForm } from '@/components/dashboard/apply-loan-form';
import { requireApprovedUser } from '@/lib/auth/require-approved';

export default async function ApplyForLoanPage() {
  const { profile } = await requireApprovedUser();

  if (profile.role !== 'BORROWER') {
    redirect('/dashboard/marketplace');
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-500">Borrower</p>
        <h1 className="mt-2 text-2xl font-black text-neutral-950 dark:text-white sm:text-3xl">Apply for Loan</h1>
        <p className="mt-2 text-sm leading-7 text-neutral-600 dark:text-neutral-300">
          Submit a collateral-backed loan request to the investor marketplace. Your application will appear once
          verified investors can review and fund it.
        </p>
      </div>
      <ApplyLoanForm />
    </section>
  );
}
