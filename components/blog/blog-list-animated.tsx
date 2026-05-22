'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { CalendarDays, Clock3, Newspaper, TrendingUp } from 'lucide-react';
import { BLOG_POSTS } from '@/lib/blog/posts';

const tones = [
  'from-brand-500 to-brand-300',
  'from-slate-800 to-slate-500',
  'from-amber-500 to-brand-500',
  'from-emerald-500 to-brand-400',
  'from-orange-500 to-rose-500',
  'from-violet-500 to-brand-500',
  'from-cyan-500 to-brand-400',
  'from-rose-500 to-orange-400',
  'from-indigo-500 to-brand-500',
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const card = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

export function BlogListAnimated() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
    >
      {BLOG_POSTS.map((article, index) => (
        <motion.article
          key={article.slug}
          variants={card}
          className="glass-card group overflow-hidden rounded-[2rem] transition hover:-translate-y-1"
        >
          <Link href={`/blog/${article.slug}`}>
            <div className={`h-44 bg-gradient-to-br ${tones[index % tones.length]} p-5 text-white`}>
              <div className="flex items-center justify-between text-white/90">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                  <Newspaper size={13} /> {article.tag}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                  <Clock3 size={13} /> {article.readTime}
                </span>
              </div>
              <div className="mt-16 flex items-end justify-between">
                <p className="text-sm uppercase tracking-[0.3em] text-white/75">Oxyile editorial</p>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 backdrop-blur-xl">
                  <TrendingUp size={20} />
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                <CalendarDays size={14} /> {article.publishedAt}
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-950 dark:text-white">{article.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{article.excerpt}</p>
            </div>
          </Link>
        </motion.article>
      ))}
    </motion.div>
  );
}
