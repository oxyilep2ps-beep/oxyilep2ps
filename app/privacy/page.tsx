import Link from 'next/link';
import { Footer } from '@/components/footer';

export const metadata = {
  title: 'Privacy Policy — Oxyile',
};

export default function PrivacyPage() {
  return (
    <>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="glass-card rounded-2xl p-8">
          <h1 className="text-3xl font-black text-neutral-950 dark:text-white">Privacy Policy</h1>
          <p className="mt-4 text-sm leading-7 text-neutral-600 dark:text-neutral-300">
            Oxyile processes personal data in line with UK GDPR for KYC, onboarding, and platform operations. Full legal
            copy will be published prior to public launch.
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
