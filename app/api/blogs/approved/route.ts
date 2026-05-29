import { NextResponse } from 'next/server';
import { listApprovedBlogsPublic } from '@/app/actions/admin-blogs';

export async function GET() {
  const rows = await listApprovedBlogsPublic();
  const posts = rows.map((row) => ({
    slug: row.slug as string,
    title: row.title as string,
    excerpt: (row.content as string).replace(/<[^>]+>/g, '').slice(0, 160),
    cover_image: (row.cover_image_url as string | null) ?? (row.cover_image as string | null) ?? null,
    publishedAt: new Date(row.created_at as string).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
  }));
  return NextResponse.json({ posts });
}
