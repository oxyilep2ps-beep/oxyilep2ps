'use client';

import Link from 'next/link';
import { ArrowLeft, LifeBuoy, Mail } from 'lucide-react';
import { SOCIAL_LINKS, supportMailto } from '@/lib/social-links';

export default function HelpSupportPage() {
  return (
    <section className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <Link
        href="/dashboard/settings"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 dark:text-brand-300"
      >
        <ArrowLeft size={16} />
        Settings
      </Link>

      <div className="glass-card rounded-2xl p-8">
        <LifeBuoy className="mx-auto text-brand-500" size={40} />
        <h1 className="mt-4 text-center text-xl font-black text-neutral-950 dark:text-white">Help & Support</h1>
        <p className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-300">
          Our compliance and onboarding team typically responds within one business day.
        </p>

        <a
          href={supportMailto}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-glow hover:bg-brand-400"
        >
          <Mail size={18} />
          Email {SOCIAL_LINKS.supportEmail}
        </a>

        <ul className="mt-6 space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
          <li>
            <span className="font-semibold text-neutral-800 dark:text-neutral-100">KYC pending?</span> You will unlock
            chat and handshakes once an admin approves your profile.
          </li>
          <li>
            <span className="font-semibold text-neutral-800 dark:text-neutral-100">Handshake issues?</span> Include your
            registered email and handshake ID in your message.
          </li>
          <li>
            <span className="font-semibold text-neutral-800 dark:text-neutral-100">GoCardless mandate?</span> Borrowers
            can set up Direct Debit from an active handshake in chat.
          </li>
        </ul>
      </div>
    </section>
  );
}
