'use client';

import { motion } from 'framer-motion';
import type { BlogPost } from '@/lib/blog/posts';

export function BlogPostAnimated({ post }: { post: BlogPost }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
    >
      <p className="mt-8 text-lg leading-8 text-slate-600 dark:text-slate-300">{post.excerpt}</p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="prose prose-slate mt-10 max-w-none dark:prose-invert"
      >
        {post.body.map((paragraph, i) => (
          <motion.p
            key={paragraph.slice(0, 40)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08, duration: 0.45 }}
            className="mb-6 text-base leading-8 text-slate-700 dark:text-slate-300"
          >
            {paragraph}
          </motion.p>
        ))}
      </motion.div>
    </motion.div>
  );
}
