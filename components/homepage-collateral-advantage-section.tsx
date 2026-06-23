'use client';

import { motion } from 'framer-motion';
import { Building2, UserCheck } from 'lucide-react';

const CARDS = [
  {
    icon: Building2,
    title: 'Property Backed',
    text: 'Loans are secured against verified real estate and high-value assets, with LTV ratios monitored in real time to protect investor capital.',
    accent: 'from-amber-500/20 to-orange-500/5',
    iconBg: 'from-amber-500 to-orange-400',
  },
  {
    icon: UserCheck,
    title: 'Guarantor Backed',
    text: 'Optional co-signers undergo E-Sign and KYC verification, creating legally bound guarantor liability that further reduces default exposure.',
    accent: 'from-brand-500/20 to-purple-500/5',
    iconBg: 'from-brand-500 to-brand-400',
  },
] as const;

export function HomepageCollateralAdvantageSection() {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-brand-500">Asset-backed lending</p>
          <h2 className="mt-4 text-3xl font-black text-neutral-950 dark:text-white sm:text-4xl">
            The Collateral Advantage
          </h2>
          <p className="mt-4 text-sm leading-7 text-neutral-600 dark:text-neutral-300">
            Every penny lent on Oxyile is anchored to real-world security — not speculative promises.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-8 md:grid-cols-2">
          {CARDS.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.article
                key={card.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: index * 0.12 }}
                className="glass-card relative overflow-hidden rounded-[2rem] p-8 sm:p-10"
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accent} opacity-80`}
                />
                <div className="relative">
                  <span
                    className={`grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br ${card.iconBg} text-white shadow-glow`}
                  >
                    <Icon size={30} strokeWidth={2} />
                  </span>
                  <h3 className="mt-6 text-2xl font-black text-neutral-950 dark:text-white">{card.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-neutral-600 dark:text-neutral-300">{card.text}</p>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
