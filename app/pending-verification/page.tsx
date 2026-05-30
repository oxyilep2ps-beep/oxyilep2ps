'use client';

import { motion } from 'framer-motion';
import { Mail, Shield } from 'lucide-react';
import Link from 'next/link';
import { supportMailto, SOCIAL_LINKS } from '@/lib/social-links';

export default function PendingVerificationPage() {
  return (
    <section className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-16 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="glass-card w-full max-w-lg rounded-[2rem] p-8 text-center shadow-glass sm:p-10"
      >
        <motion.div
          className="relative mx-auto grid h-20 w-20 place-items-center"
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(255, 90, 31, 0.35)',
              '0 0 32px 8px rgba(255, 90, 31, 0.25)',
              '0 0 0 0 rgba(255, 90, 31, 0.35)',
            ],
          }}
          transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
        >
          <div className="grid h-20 w-20 place-items-center rounded-2xl bg-brand-500/10 text-brand-500">
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
            >
              <Shield size={40} strokeWidth={1.5} />
            </motion.div>
          </div>
        </motion.div>

        <h1 className="mt-8 text-2xl font-black text-neutral-950 dark:text-white sm:text-3xl">
          Verification is still pending
        </h1>

        <p className="mt-4 text-sm leading-7 text-neutral-600 dark:text-neutral-300">
          Please wait for the verification to get completed. The maximum time to verify your profile is{' '}
          <span className="font-semibold text-brand-600 dark:text-brand-300">2 days</span>. If your verification is
          not completed within 2 days, please contact our support team at{' '}
          <a
            href={supportMailto}
            className="font-medium text-brand-600 underline decoration-brand-500/40 underline-offset-2 hover:text-brand-500 dark:text-brand-300"
          >
            {SOCIAL_LINKS.supportEmail}
          </a>
          .
        </p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
        >
          <Link
            href="/"
            className="rounded-full border border-neutral-200 px-6 py-3 text-sm font-semibold text-neutral-700 transition hover:border-brand-300 dark:border-white/10 dark:text-neutral-200"
          >
            Back to home
          </Link>
          <a
            href={supportMailto}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-400"
          >
            <Mail size={16} />
            Email support
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}
