import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarDays, Clock3 } from 'lucide-react';
import { Footer } from '@/components/footer';
import { BlogPostAnimated } from '@/components/blog/blog-post-animated';
import { getAllPostSlugs, getPostBySlug } from '@/lib/blog/posts';

export function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: 'Article — Oxyile' };
  return { title: `${post.title} — Oxyile`, description: post.excerpt };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link href="/blogs" className="text-sm font-semibold text-brand-600 hover:text-brand-500">
        ← All insights
      </Link>
      <header>
        <p className="mt-6 text-sm uppercase tracking-[0.3em] text-brand-500">{post.tag}</p>
        <h1 className="mt-3 text-4xl font-black leading-tight text-slate-950 dark:text-white sm:text-5xl">
          {post.title}
        </h1>
        <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          <span className="inline-flex items-center gap-2">
            <CalendarDays size={14} /> {post.publishedAt}
          </span>
          <span className="inline-flex items-center gap-2">
            <Clock3 size={14} /> {post.readTime}
          </span>
        </div>
      </header>
      <BlogPostAnimated post={post} />
      <Footer />
    </article>
  );
}
