import Link from 'next/link';
import { Footer } from '@/components/footer';
import { Lock, Scale, ShieldCheck, Wallet } from 'lucide-react';

export const metadata = {
  title: 'Security — Oxyile',
  description: 'How Oxyile protects your data, funds, and smart-contract agreements.',
};

const pillars = [
  {
    icon: Lock,
    title: 'Data Encryption',
    body:
      'All sensitive profile, KYC, and collateral documents are encrypted at rest and in transit using bank-grade 256-bit AES. Access is restricted through role-based policies, with admin audit trails for every compliance action.',
  },
  {
    icon: Scale,
    title: 'FCA Compliance & Risk Management',
    body:
      'Oxyile operates with FCA authorisation in progress. Our onboarding enforces UK KYC, appropriateness testing for investors, affordability checks for borrowers, and mandatory risk disclosures before any handshake is initiated.',
  },
  {
    icon: ShieldCheck,
    title: 'Smart Contract Audits (Polygon)',
    body:
      'Loan handshakes are immutably recorded on the Polygon network. Contract logic is reviewed for re-entrancy, access control, and settlement integrity. Transaction hashes are surfaced in admin dashboards for full auditability.',
  },
  {
    icon: Wallet,
    title: 'Secure Payments (GoCardless)',
    body:
      'Fiat collections and Direct Debit mandates are processed through GoCardless, a regulated payments provider. Borrower mandates are tokenised — Oxyile never stores raw card or bank credentials on platform servers.',
  },
];

export default function SecurityPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-brand-500/10 via-transparent to-transparent py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-brand-500">Enterprise security</p>
          <h1 className="mt-4 text-4xl font-black text-neutral-950 dark:text-white sm:text-5xl">
            Your trust is our infrastructure
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-neutral-600 dark:text-neutral-300">
            Oxyile is engineered for regulated peer-to-peer lending — combining cryptographic data protection,
            on-chain contract integrity, and institutional payment rails.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2">
          {pillars.map(({ icon: Icon, title, body }) => (
            <article key={title} className="glass-card rounded-2xl p-7">
              <div className="mb-4 inline-flex rounded-xl bg-brand-500/15 p-3 text-brand-600 dark:text-brand-300">
                <Icon size={22} />
              </div>
              <h2 className="text-xl font-bold text-neutral-950 dark:text-white">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-neutral-600 dark:text-neutral-300">{body}</p>
            </article>
          ))}
        </div>

        <div className="glass-card mt-10 rounded-2xl border border-brand-500/20 p-8 text-center">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Questions about our security posture? Contact our compliance team at{' '}
            <a href="mailto:oxyilemoneyquest.support@gmail.com" className="font-semibold text-brand-600 dark:text-brand-300">
              oxyilemoneyquest.support@gmail.com
            </a>
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-glow hover:bg-brand-400"
          >
            Back to home
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
