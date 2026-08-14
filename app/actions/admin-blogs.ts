'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/auth/assert-admin';
import { slugifyBlogTitle } from '@/lib/blog/slug';
import type { BlogRow } from '@/lib/blog/types';
import { normalizeTagList } from '@/lib/blog/tags';
import { createAdminClient, tryCreateAdminClient } from '@/lib/supabase/admin';
import { triggerSocialSyndication } from '@/lib/services/socialSyndication';
import { logAdminAction } from '@/app/actions/admin-audit';

function mapRow(row: Record<string, unknown>): BlogRow {
  const inline = row.inline_images;
  return {
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    content: String(row.content ?? ''),
    cover_image_url: (row.cover_image_url as string | null) ?? (row.cover_image as string | null) ?? null,
    author_id: (row.author_id as string | null) ?? null,
    status: row.status as BlogRow['status'],
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    published_at: (row.published_at as string | null) ?? null,
    category: (row.category as string | null) ?? 'FinTech',
    tags: normalizeTagList(row.tags),
    share_linkedin: Boolean(row.share_linkedin),
    share_instagram: Boolean(row.share_instagram),
    cover_image_alt: (row.cover_image_alt as string | null) ?? null,
    social_caption: (row.social_caption as string | null) ?? null,
    auto_share_socials: row.auto_share_socials !== false,
    social_share_status: (row.social_share_status as string | null) ?? 'pending',
    priority: Number(row.priority ?? 0),
    meta_description: String(row.meta_description ?? ''),
    focus_keyword: String(row.focus_keyword ?? ''),
    approved_at: (row.approved_at as string | null) ?? null,
    approved_by: (row.approved_by as string | null) ?? null,
    admin_feedback: (row.admin_feedback as string | null) ?? null,
    rejection_reason: (row.rejection_reason as string | null) ?? null,
    inline_images: Array.isArray(inline) ? inline.map(String) : [],
  };
}

export type AdminBlogRow = BlogRow;

export async function listPendingBlogs(): Promise<AdminBlogRow[]> {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('blogs')
    .select('*')
    .eq('status', 'PENDING_APPROVAL')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function listPublishedBlogs(
  sort: 'newest' | 'oldest' | 'custom' = 'newest'
): Promise<AdminBlogRow[]> {
  await assertAdmin();
  const admin = createAdminClient();
  let query = admin.from('blogs').select('*').eq('status', 'PUBLISHED');

  if (sort === 'oldest') {
    query = query.order('published_at', { ascending: true, nullsFirst: false }).order('created_at', {
      ascending: true,
    });
  } else if (sort === 'custom') {
    query = query
      .order('priority', { ascending: false })
      .order('published_at', { ascending: false, nullsFirst: false });
  } else {
    query = query
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function getAdminBlog(id: string): Promise<AdminBlogRow | null> {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from('blogs').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function createAdminBlog(payload: {
  title: string;
  content: string;
  cover_image_url?: string | null;
}) {
  const user = await assertAdmin();
  const admin = createAdminClient();
  const slug = `${slugifyBlogTitle(payload.title)}-${Date.now().toString(36)}`;

  const { error } = await admin.from('blogs').insert({
    title: payload.title.trim(),
    slug,
    content: payload.content.trim(),
    cover_image_url: payload.cover_image_url ?? null,
    author_id: user.id,
    status: 'PUBLISHED',
    approved_at: new Date().toISOString(),
    approved_by: user.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath('/blogs');
  revalidatePath('/admin-dashboard/blogs');
  return { success: true, slug };
}

export async function approveBlog(
  id: string,
  updates?: { title?: string; content?: string; cover_image_url?: string | null }
) {
  const user = await assertAdmin();
  const admin = createAdminClient();

  const { data: blog } = await admin
    .from('blogs')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  const chronology =
    (blog?.published_at as string | null) ||
    (blog?.created_at as string | null) ||
    new Date().toISOString();

  const { data: published, error } = await admin
    .from('blogs')
    .update({
      ...(updates?.title ? { title: updates.title } : {}),
      ...(updates?.content ? { content: updates.content } : {}),
      ...(updates?.cover_image_url !== undefined ? { cover_image_url: updates.cover_image_url } : {}),
      status: 'PUBLISHED',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      published_at: chronology,
      created_at: chronology,
      admin_feedback: null,
      rejection_reason: null,
      social_share_status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) throw new Error(error.message);

  await logAdminAction(user.email ?? 'admin', `Approved blog "${blog?.title ?? id}"`);
  revalidatePath('/blogs');
  revalidatePath('/admin-dashboard/blogs');
  revalidatePath('/blog');

  const post = published ?? blog;
  const shouldSyndicate =
    post &&
    (Boolean(post.share_linkedin) ||
      Boolean(post.share_instagram) ||
      post.auto_share_socials === true);

  if (shouldSyndicate && post) {
    // Fire-and-forget — do not block the admin UI response
    void triggerSocialSyndication(
      {
        id: String(post.id),
        title: String(updates?.title?.trim() || post.title || 'Untitled'),
        slug: String(post.slug),
        cover_image: (updates?.cover_image_url ??
          post.cover_image_url ??
          post.cover_image) as string | null,
        cover_image_url: (updates?.cover_image_url ??
          post.cover_image_url ??
          post.cover_image) as string | null,
        cover_image_alt: (post.cover_image_alt as string | null) ?? null,
        social_caption: (post.social_caption as string | null) ?? null,
        meta_description: (post.meta_description as string | null) ?? null,
        auto_share_socials:
          Boolean(post.share_linkedin) ||
          Boolean(post.share_instagram) ||
          post.auto_share_socials === true,
        share_linkedin: Boolean(post.share_linkedin),
        share_instagram: Boolean(post.share_instagram),
      },
      { table: 'blogs' }
    ).catch((err) => {
      console.error('[approveBlog] Social syndication failed', err);
    });
  }

  return { success: true };
}

export async function rejectBlog(
  id: string,
  input?: { rejectionReason?: string; adminFeedback?: string }
) {
  const user = await assertAdmin();
  const admin = createAdminClient();

  const { data: blog } = await admin.from('blogs').select('title').eq('id', id).maybeSingle();

  const { error } = await admin
    .from('blogs')
    .update({
      status: 'REJECTED',
      rejection_reason: input?.rejectionReason?.trim() || 'Other',
      admin_feedback: input?.adminFeedback?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  await logAdminAction(
    user.email ?? 'admin',
    `Rejected blog "${blog?.title ?? id}" (${input?.rejectionReason ?? 'Other'})`
  );
  revalidatePath('/admin-dashboard/blogs');
  revalidatePath('/blogger');
  revalidatePath('/blogs');
  return { success: true };
}

export async function updateAdminPublishedBlog(
  id: string,
  updates: { title: string; content: string; cover_image_url?: string | null }
) {
  await assertAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from('blogs')
    .update({
      title: updates.title.trim(),
      content: updates.content.trim(),
      cover_image_url: updates.cover_image_url ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/blogs');
  revalidatePath('/admin-dashboard/blogs');
  revalidatePath('/blog');
  return { success: true };
}

export async function deleteAdminBlog(id: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('blogs').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/blogs');
  revalidatePath('/admin-dashboard/blogs');
  revalidatePath('/blog');
  return { success: true };
}

export async function listApprovedBlogsPublic() {
  const admin = tryCreateAdminClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from('blogs')
    .select('id, title, slug, content, cover_image_url, cover_image, created_at, published_at, tags, priority')
    .eq('status', 'PUBLISHED')
    .order('priority', { ascending: false })
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function getApprovedBlogBySlug(slug: string) {
  const admin = tryCreateAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from('blogs')
    .select(
      'id, title, slug, content, cover_image_url, cover_image, created_at, published_at, tags, category, priority'
    )
    .eq('slug', slug)
    .eq('status', 'PUBLISHED')
    .maybeSingle();
  return data;
}

export async function persistPublishedBlogOrder(orderedIds: string[]) {
  await assertAdmin();
  const admin = createAdminClient();
  const total = orderedIds.length;

  // Highest priority first in the list (index 0 => total)
  const updates = orderedIds.map((id, index) =>
    admin.rpc('update_blog_priority', {
      blog_id: id,
      new_priority: total - index,
    })
  );

  const results = await Promise.all(updates);
  const firstError = results.find((r) => r.error)?.error;
  if (firstError) {
    // Fallback when RPC is not yet migrated — direct updates
    for (let i = 0; i < orderedIds.length; i += 1) {
      const { error } = await admin
        .from('blogs')
        .update({ priority: total - i, updated_at: new Date().toISOString() })
        .eq('id', orderedIds[i]!);
      if (error) throw new Error(error.message);
    }
  }

  revalidatePath('/blogs');
  revalidatePath('/blog');
  revalidatePath('/admin-dashboard/blogs');
  return { success: true };
}
