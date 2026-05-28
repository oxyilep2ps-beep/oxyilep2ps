import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { Footer } from '@/components/footer';
import { BlogPostAnimated } from '@/components/blog/blog-post-animated';
import { getAllPostSlugs, getPostBySlug } from '@/lib/blog/posts';
import { getApprovedBlogBySlug } from '@/app/actions/admin-blogs';

export function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dbPost = await getApprovedBlogBySlug(slug);
  if (dbPost) {
    return { title: `${dbPost.title} — Oxyile`, description: String(dbPost.content).slice(0, 160) };
  }
  const post = getPostBySlug(slug);
  if (!post) return { title: 'Article — Oxyile' };
  return { title: `${post.title} — Oxyile`, description: post.excerpt };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dbPost = await getApprovedBlogBySlug(slug);

  if (dbPost) {
    return (
      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Link href="/blogs" className="text-sm font-semibold text-brand-600 hover:text-brand-500">
          ← All insights
        </Link>
        {dbPost.cover_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dbPost.cover_image as string}
            alt=""
            className="mt-8 w-full rounded-2xl object-cover"
          />
        )}
        <header>
          <p className="mt-6 text-sm uppercase tracking-[0.3em] text-brand-500">Oxyile Editorial</p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-slate-950 dark:text-white sm:text-5xl">
            {dbPost.title as string}
          </h1>
          <p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            <CalendarDays size={14} />
            {new Date(dbPost.created_at as string).toLocaleDateString('en-GB')}
          </p>
        </header>
        <div
          className="prose prose-neutral mt-10 max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: String(dbPost.content) }}
        />
        <Footer />
      </article>
    );
  }

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
      </header>
      <BlogPostAnimated post={post} />
      <Footer />
    </article>
  );
}
