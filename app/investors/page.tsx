'use client';

import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { BarChart4, Layers3, ShieldCheck, SplitSquareHorizontal } from 'lucide-react';
import { Footer } from '@/components/footer';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

function Section({ children }: { children: React.ReactNode }) {
  return <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">{children}</section>;
}

export default function InvestorsPage() {
  return (
    <Section>
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-500">Dashboard preview</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">Investors</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">A concise overview of investor terms, risk diversification strategies, secondary market options, and Tier 1 bank fund segregation policies.</p>
      </motion.div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {[
          { title: 'Investor terms', icon: <BarChart4 size={20} />, body: ['Target rate bands between 5-12%', 'No hidden fees and clear term sheets', 'Direct negotiation with verified borrowers'] },
          { title: 'Risk diversification strategies', icon: <SplitSquareHorizontal size={20} />, body: ['Spread capital across multiple profiles', 'Balance term lengths and risk levels', 'Blend low-risk and growth opportunities'] },
          { title: 'Secondary market options', icon: <Layers3 size={20} />, body: ['Potential exit pathways for eligible loans', 'Improve liquidity and portfolio flexibility', 'Designed for qualified investors'] },
          { title: 'Tier 1 bank segregation policies', icon: <ShieldCheck size={20} />, body: ['Client money held separately from operating funds', 'Bank-grade protection with transparent controls', 'Compliance-forward custody practices'] },
        ].map((item) => (
          <motion.div key={item.title} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="glass-card rounded-[2rem] p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">{item.icon}</div>
            <h2 className="mt-5 text-2xl font-bold text-slate-950 dark:text-white">{item.title}</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              {item.body.map((entry) => (
                <li key={entry} className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-brand-500" />{entry}</li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
      <Footer />
    </Section>
  );
}