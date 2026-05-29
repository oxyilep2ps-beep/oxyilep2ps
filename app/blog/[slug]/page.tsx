import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { Footer } from '@/components/footer';
import { getApprovedBlogBySlug, listApprovedBlogsPublic } from '@/app/actions/admin-blogs';

export async function generateStaticParams() {
  const rows = await listApprovedBlogsPublic();
  return rows.map((row) => ({ slug: row.slug as string }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dbPost = await getApprovedBlogBySlug(slug);
  if (!dbPost) return { title: 'Article — Oxyile' };
  const plain = String(dbPost.content).replace(/<[^>]+>/g, '').slice(0, 160);
  return { title: `${dbPost.title} — Oxyile`, description: plain };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dbPost = await getApprovedBlogBySlug(slug);

  if (!dbPost) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link href="/blogs" className="text-sm font-semibold text-brand-600 hover:text-brand-500">
        ← All insights
      </Link>
      {(dbPost.cover_image_url ?? dbPost.cover_image) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={(dbPost.cover_image_url ?? dbPost.cover_image) as string}
          alt=""
          className="mt-8 w-full rounded-2xl object-cover"
        />
      ) : (
        <div className="mt-8 flex h-48 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 via-brand-400 to-orange-400 text-white">
          <span className="text-sm font-bold uppercase tracking-widest">Oxyile Insights</span>
        </div>
      )}
      <header>
        <p className="mt-6 text-sm uppercase tracking-[0.3em] text-brand-500">Oxyile Editorial</p>
        <h1 className="mt-3 text-4xl font-black leading-tight text-slate-950 dark:text-white sm:text-5xl">
          {dbPost.title as string}
        </h1>
        <p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          <CalendarDays size={14} />
          {new Date(dbPost.created_at as string).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
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
