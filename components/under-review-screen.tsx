'use client';

import { motion } from 'framer-motion';
import { Clock, Mail, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { supportMailto } from '@/lib/social-links';

interface UnderReviewScreenProps {
  fullLegalName?: string;
  submissionId?: string;
}

export function UnderReviewScreen({ fullLegalName, submissionId }: UnderReviewScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="glass-card mx-auto max-w-xl rounded-[2rem] p-10 text-center shadow-glass"
    >
      <motion.div
        animate={{ rotate: [0, 4, -4, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
        className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-500/10 text-brand-500"
      >
        <Clock size={32} />
      </motion.div>

      <h2 className="mt-6 text-2xl font-black text-neutral-950 dark:text-white">Under Review</h2>
      <p className="mt-3 text-sm leading-7 text-neutral-600 dark:text-neutral-300">
        {fullLegalName ? `Thank you, ${fullLegalName}. ` : ''}
        Your application is pending compliance review. Oxyile operates on an invite and approve-only basis in line with UK FCA expectations.
      </p>

      <motion.ul
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.1 } } }}
        className="mt-8 space-y-3 text-left text-sm text-neutral-700 dark:text-neutral-300"
      >
        {[
          'KYC and AML checks are being verified by our team.',
          'You will receive an email once your account is approved or if we need more information.',
          'Typical review window: 2–5 business days.',
        ].map((line) => (
          <motion.li
            key={line}
            variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}
            className="flex items-start gap-3 rounded-xl border border-white/60 bg-white/50 px-4 py-3 dark:border-white/10 dark:bg-black/40"
          >
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-brand-500" />
            {line}
          </motion.li>
        ))}
      </motion.ul>

      {submissionId ? (
        <p className="mt-6 text-xs text-neutral-500 dark:text-neutral-400">
          Reference: <span className="font-mono">{submissionId}</span>
        </p>
      ) : null}

      <Link
        href={supportMailto}
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-400"
      >
        <Mail size={16} />
        Contact support
      </Link>
    </motion.div>
  );
}

export default UnderReviewScreen;
