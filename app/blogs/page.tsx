'use client';

import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { CalendarDays, Clock3, Newspaper, TrendingUp } from 'lucide-react';
import { Footer } from '@/components/footer';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

function Section({ children }: { children: React.ReactNode }) {
  return <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">{children}</section>;
}

const articles = [
  { title: 'How P2P lending is reshaping UK borrowing', tag: 'Guide', read: '6 min read', tone: 'from-brand-500 to-brand-300' },
  { title: 'Market update: inflation, rates, and investor demand', tag: 'Market', read: '4 min read', tone: 'from-slate-800 to-slate-500' },
  { title: 'Building a balanced investor portfolio in 2026', tag: 'Strategy', read: '8 min read', tone: 'from-amber-500 to-brand-500' },
  { title: 'KYC, AML, and why compliance builds trust', tag: 'Compliance', read: '5 min read', tone: 'from-emerald-500 to-brand-400' },
  { title: 'Choosing the right loan term for monthly flexibility', tag: 'Borrowing', read: '7 min read', tone: 'from-orange-500 to-rose-500' },
  { title: 'Secondary market basics for smart investors', tag: 'Investing', read: '6 min read', tone: 'from-violet-500 to-brand-500' },
];

export default function BlogsPage() {
  return (
    <Section>
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-500">Insights</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">Blogs / Insights</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">Fintech articles, market updates, and P2P lending guides presented with a clean editorial grid and modern imagery placeholders.</p>
      </motion.div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {articles.map((article) => (
          <motion.article key={article.title} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="glass-card group overflow-hidden rounded-[2rem] transition hover:-translate-y-1">
            <div className={`h-44 bg-gradient-to-br ${article.tone} p-5 text-white`}>
              <div className="flex items-center justify-between text-white/90">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md"><Newspaper size={13} /> {article.tag}</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md"><Clock3 size={13} /> {article.read}</span>
              </div>
              <div className="mt-16 flex items-end justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-white/75">Oxyile editorial</p>
                  <p className="mt-2 max-w-sm text-2xl font-black leading-tight">Modern insights for borrowers and investors</p>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 backdrop-blur-xl"><TrendingUp size={20} /></div>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                <CalendarDays size={14} /> 11 May 2026
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-950 dark:text-white">{article.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">Rich imagery placeholders and polished layouts support a premium reading experience across all screen sizes.</p>
            </div>
          </motion.article>
        ))}
      </div>
      <Footer />
    </Section>
  );
}