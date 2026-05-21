import Link from 'next/link';
import { Footer } from '@/components/footer';

export const metadata = {
  title: 'Terms of Service — Oxyile',
};

export default function TermsPage() {
  return (
    <>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="glass-card rounded-2xl p-8">
          <h1 className="text-3xl font-black text-neutral-950 dark:text-white">Terms of Service</h1>
          <p className="mt-4 text-sm leading-7 text-neutral-600 dark:text-neutral-300">
            Use of the Oxyile peer-to-peer lending platform is subject to FCA-aligned terms, risk disclosures, and
            eligibility requirements. Complete terms will be published prior to public launch.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm font-semibold text-brand-600 dark:text-brand-300">
            ← Back to home
          </Link>
        </div>
      </section>
      <Footer />
    </>
  );
}
