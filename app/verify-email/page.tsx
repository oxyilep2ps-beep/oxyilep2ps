'use client';

import Link from 'next/link';
import { Mail } from 'lucide-react';
import { Footer } from '@/components/footer';
import { Logo } from '@/components/logo';

export default function VerifyEmailPage() {
  return (
    <section className="mx-auto max-w-lg px-4 py-20 sm:px-6">
      <div className="mb-6 flex justify-center">
        <Logo size="lg" />
      </div>
      <div className="glass-card rounded-[2rem] p-8 text-center shadow-glow">
        <Mail className="mx-auto text-brand-500" size={48} />
        <h1 className="mt-6 text-2xl font-black text-neutral-950 dark:text-white">Verify your email</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          We sent a confirmation link to your inbox. Click it to activate your Oxyile account before signing in.
        </p>
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          Confirm your email ID. Please check your spam box if you do not see it within a few minutes.
        </p>
        <Link
          href="/signin"
          className="mt-6 inline-flex rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-glow hover:bg-brand-400"
        >
          Back to sign in
        </Link>
      </div>
      <Footer />
    </section>
  );
}
