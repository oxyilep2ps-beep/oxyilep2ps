'use client';

import { motion } from 'framer-motion';

const TEAM_MESSAGE =
  'At Oxyile, we are bridging the gap between traditional fiat banking and immutable Web3 ledgers. Our mission is to democratize peer-to-peer lending, making it more transparent, secure, and accessible for everyone in the UK and beyond. Welcome to the future of finance.';

export function TeamSection() {
  return (
    <section id="team" className="py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-brand-500">Our Team</p>
          <h2 className="section-heading mt-3">Built for the Future of Finance</h2>
        </motion.div>

        <motion.article
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className="glass-card mx-auto mt-12 max-w-5xl rounded-[2rem] border border-white/50 p-10 text-center shadow-glow dark:border-white/10 sm:p-14"
        >
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-500">A Message From Our Team</p>
          <p className="mt-6 text-lg leading-8 text-neutral-700 dark:text-neutral-200 sm:text-xl sm:leading-9">
            {TEAM_MESSAGE}
          </p>
          <div className="mx-auto mt-8 h-px w-24 bg-gradient-to-r from-transparent via-brand-500/60 to-transparent" />
        </motion.article>
      </motion.div>
    </section>
  );
}

export default TeamSection;
