'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { CalendarDays, Newspaper } from 'lucide-react';

export type PublicBlogCard = {
  slug: string;
  title: string;
  excerpt: string;
  cover_image: string | null;
  publishedAt: string;
};

const card = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function BlogListDb({ posts }: { posts: PublicBlogCard[] }) {
  if (posts.length === 0) return null;

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
      className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
    >
      {posts.map((article) => (
        <motion.article key={article.slug} variants={card} className="glass-card overflow-hidden rounded-[2rem]">
          <Link href={`/blog/${article.slug}`}>
            {article.cover_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={article.cover_image} alt="" className="h-44 w-full object-cover" />
            ) : (
              <div className="flex h-44 items-center justify-center bg-gradient-to-br from-brand-500 to-brand-300 text-white">
                <Newspaper size={32} />
              </div>
            )}
            <div className="p-6">
              <p className="text-xs uppercase tracking-wider text-brand-500">Published</p>
              <h2 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{article.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{article.excerpt}</p>
              <p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                <CalendarDays size={14} />
                {article.publishedAt}
              </p>
            </div>
          </Link>
        </motion.article>
      ))}
    </motion.div>
  );
}
