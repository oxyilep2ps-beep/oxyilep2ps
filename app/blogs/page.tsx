'use client';

import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Footer } from '@/components/footer';
import { BlogListAnimated } from '@/components/blog/blog-list-animated';
import { BlogListDb, type PublicBlogCard } from '@/components/blog/blog-list-db';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

function Section({ children }: { children: React.ReactNode }) {
  return <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">{children}</section>;
}

export default function BlogsPage() {
  const [approved, setApproved] = useState<PublicBlogCard[]>([]);

  useEffect(() => {
    void fetch('/api/blogs/approved')
      .then((r) => r.json())
      .then((body: { posts?: PublicBlogCard[] }) => setApproved(body.posts ?? []))
      .catch(() => setApproved([]));
  }, []);

  return (
    <Section>
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-500">Insights</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
          Blogs / Insights
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
          Fintech articles, market updates, and HR-approved editorial from the Oxyile team.
        </p>
      </motion.div>

      <BlogListDb posts={approved} />
      <BlogListAnimated />
      <Footer />
    </Section>
  );
}
