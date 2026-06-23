'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, TrendingUp, Users } from 'lucide-react';

const STEPS = [
  {
    icon: Users,
    title: 'Smart Handshake Matching',
    text: 'Borrowers and Investors are perfectly matched based on verified collateral and capital requirements.',
  },
  {
    icon: ShieldCheck,
    title: 'FCA-Compliant Escrow',
    text: 'Funds are securely routed through regulated Client Money accounts, ensuring zero peer-to-peer friction.',
  },
  {
    icon: TrendingUp,
    title: 'Fixed 10% APY',
    text: 'Investors enjoy predictable, collateral-backed returns while borrowers get fair, transparent liquidity.',
  },
] as const;

export function HomepageProtocolSection() {
  return (
    <section className="relative py-24">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-500/5 via-transparent to-transparent" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-brand-500">The Oxyile Protocol</p>
          <h2 className="mt-4 text-3xl font-black text-neutral-950 dark:text-white sm:text-4xl">
            How The Oxyile Protocol Works
          </h2>
          <p className="mt-4 text-sm leading-7 text-neutral-600 dark:text-neutral-300">
            A regulated, asset-backed lending loop designed for trust, speed, and predictable outcomes.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.article
                key={step.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass-card group relative overflow-hidden rounded-[1.75rem] p-8 transition hover:-translate-y-1 hover:shadow-glass"
              >
                <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-brand-500/20 to-transparent blur-2xl transition group-hover:from-brand-500/30" />
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-orange-400 text-white shadow-glow">
                  <Icon size={26} strokeWidth={2.25} />
                </span>
                <h3 className="mt-6 text-lg font-bold text-neutral-950 dark:text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-neutral-600 dark:text-neutral-300">{step.text}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
