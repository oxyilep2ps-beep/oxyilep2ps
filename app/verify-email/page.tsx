'use client';

import Link from 'next/link';
import { Mail } from 'lucide-react';
import { Footer } from '@/components/footer';
import { Logo } from '@/components/logo';
import { SIGNUP_SUCCESS_MESSAGE } from '@/components/auth-toast';

export default function VerifyEmailPage() {
  return (
    <section className="mx-auto max-w-lg px-4 py-20 sm:px-6">
      <div className="mb-6 flex justify-center">
        <Logo size="lg" />
      </div>
      <div className="glass-card rounded-[2rem] p-8 text-center shadow-glow">
        <Mail className="mx-auto text-brand-500" size={48} />
        <h1 className="mt-6 text-2xl font-black text-neutral-950 dark:text-white">Verify your email</h1>
        <div className="mt-5 rounded-2xl border border-emerald-300 bg-emerald-600 px-4 py-4 text-left text-sm font-semibold leading-relaxed text-white shadow-lg">
          {SIGNUP_SUCCESS_MESSAGE}
        </div>
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
