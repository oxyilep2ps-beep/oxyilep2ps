'use client';

import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export default function AccountSecurityPage() {
  return (
    <section className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <Link
        href="/dashboard/settings"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 dark:text-brand-300"
      >
        <ArrowLeft size={16} />
        Settings
      </Link>
      <div className="glass-card rounded-2xl p-8 text-center">
        <Shield className="mx-auto text-brand-500" size={40} />
        <h1 className="mt-4 text-xl font-black text-neutral-950 dark:text-white">Account Security</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          Password reset, two-factor authentication, and session management are coming soon.
        </p>
      </div>
    </section>
  );
}
