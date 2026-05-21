'use client';

import { motion } from 'framer-motion';

const features = [
  {
    title: 'Negotiate Interest Rates',
    desc: 'Direct peer negotiation with private offers and counters — gamified bidding for best returns.',
    tag: 'P2P Chat',
  },
  {
    title: 'Flexible Repayment Terms',
    desc: 'Custom monthly splits, early repayment options, and milestone schedules.',
    tag: 'Flexible',
  },
  {
    title: 'Direct Communication',
    desc: 'Secure in-platform messaging with identity-verified participants.',
    tag: 'Secure Chat',
  },
  {
    title: 'Custom Escrow & Payouts',
    desc: 'Escrow controls and milestone-based releases to protect both parties.',
    tag: 'Escrow',
  },
  {
    title: 'Secondary Market',
    desc: 'Trade loan slices with instant settlement and transparent fees.',
    tag: 'Market',
  },
  {
    title: 'Real-time Analytics',
    desc: 'Live dashboards for portfolio health, repayment forecasts and stress tests.',
    tag: 'Analytics',
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <h2 className="section-heading">Core Platform Features</h2>
          <p className="section-subtitle mx-auto mt-4">Essential tools to negotiate, secure, and manage peer-to-peer lending with transparency.</p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              whileHover={{ y: -8 }}
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4 + (i % 3) * 0.6, repeat: Infinity, ease: 'easeInOut' }}
              className="glass-card relative overflow-hidden rounded-2xl p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{f.title}</h3>
                  <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{f.desc}</p>
                </div>

                <div className="ml-4 flex-shrink-0">
                  <span className="inline-flex items-center rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF814A] px-3 py-1 text-xs font-semibold text-white">{f.tag}</span>
                </div>
              </div>

              <div className="pointer-events-none absolute right-4 top-4 h-24 w-24 rounded-full opacity-10 blur-xl" style={{ background: 'radial-gradient(circle at 30% 20%, rgba(255,129,74,0.95), transparent 40%)' }} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturesGrid;
