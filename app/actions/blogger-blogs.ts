'use server';

import { revalidatePath } from 'next/cache';
import { assertBloggerOrAdmin } from '@/lib/auth/assert-blogger';
import { slugifyBlogTitle } from '@/lib/blog/slug';
import { normalizeTagList } from '@/lib/blog/tags';
import type { BlogRow, BlogStatus } from '@/lib/blog/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

function mapRow(row: Record<string, unknown>): BlogRow {
  const inline = row.inline_images;
  return {
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    content: String(row.content ?? ''),
    cover_image_url: (row.cover_image_url as string | null) ?? (row.cover_image as string | null) ?? null,
    author_id: (row.author_id as string | null) ?? null,
    status: row.status as BlogStatus,
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
    meta_description: String(row.meta_description ?? ''),
    focus_keyword: String(row.focus_keyword ?? ''),
    approved_at: (row.approved_at as string | null) ?? null,
    approved_by: (row.approved_by as string | null) ?? null,
    admin_feedback: (row.admin_feedback as string | null) ?? null,
    rejection_reason: (row.rejection_reason as string | null) ?? null,
    inline_images: Array.isArray(inline) ? inline.map(String) : [],
  };
}

function resolveBackdate(publishAt?: string | null): string | null {
  if (!publishAt) return null;
  const date = new Date(publishAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function publishingFields(payload: {
  category?: string | null;
  tags?: string[];
  share_linkedin?: boolean;
  share_instagram?: boolean;
  cover_image_alt?: string | null;
  social_caption?: string | null;
  auto_share_socials?: boolean;
  meta_description?: string | null;
  focus_keyword?: string | null;
  publishAt?: string | null;
  forPublish?: boolean;
}) {
  const autoShare =
    payload.auto_share_socials !== undefined
      ? Boolean(payload.auto_share_socials)
      : Boolean(payload.share_linkedin || payload.share_instagram);
  const backdate = resolveBackdate(payload.publishAt ?? null);
  const fields: Record<string, unknown> = {
    category: payload.category?.trim() || 'FinTech',
    tags: payload.tags ?? [],
    share_linkedin: Boolean(payload.share_linkedin ?? autoShare),
    share_instagram: Boolean(payload.share_instagram ?? autoShare),
    cover_image_alt: payload.cover_image_alt?.trim() || null,
    social_caption: payload.social_caption?.trim() || null,
    auto_share_socials: autoShare,
    meta_description: payload.meta_description?.trim() ?? '',
    focus_keyword: payload.focus_keyword?.trim() ?? '',
  };
  if (backdate) {
    fields.created_at = backdate;
    fields.published_at = backdate;
  } else if (payload.forPublish) {
    fields.published_at = new Date().toISOString();
  }
  return fields;
}

export async function listBloggerBlogs(filter: 'drafts' | 'pending' | 'published' | 'references') {
  const user = await assertBloggerOrAdmin();
  const admin = createAdminClient();

  // Fetch by author (or reference prompts), then filter status case-insensitively.
  // Avoids empty Published tabs when DB rows use mixed casing (PUBLISHED vs published).
  let query = admin.from('blogs').select('*').order('updated_at', { ascending: false });

  if (filter === 'references') {
    query = query.is('author_id', null);
  } else {
    query = query.eq('author_id', user.id);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
  const statusKey = (s: string) => s.trim().toUpperCase().replace(/\s+/g, '_');

  if (filter === 'references') {
    return rows.filter((r) => statusKey(r.status) === 'DRAFT');
  }
  if (filter === 'drafts') {
    return rows.filter((r) => {
      const s = statusKey(r.status);
      return s === 'DRAFT' || s === 'REJECTED';
    });
  }
  if (filter === 'pending') {
    return rows.filter((r) => {
      const s = statusKey(r.status);
      return s === 'PENDING_APPROVAL' || s === 'PENDING';
    });
  }
  // published
  return rows.filter((r) => statusKey(r.status) === 'PUBLISHED');
}

export async function getBloggerBlog(id: string) {
  const user = await assertBloggerOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from('blogs').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = mapRow(data as Record<string, unknown>);
  if (row.author_id && row.author_id !== user.id) {
    throw new Error('Unauthorized');
  }
  return row;
}

export async function saveBloggerDraft(payload: {
  id?: string;
  title: string;
  content: string;
  cover_image_url?: string | null;
  fromReferenceId?: string;
  category?: string | null;
  tags?: string[];
  share_linkedin?: boolean;
  share_instagram?: boolean;
  cover_image_alt?: string | null;
  social_caption?: string | null;
  auto_share_socials?: boolean;
  meta_description?: string | null;
  focus_keyword?: string | null;
  publishAt?: string | null;
}) {
  const user = await assertBloggerOrAdmin();
  const admin = createAdminClient();
  const meta = publishingFields(payload);

  if (payload.fromReferenceId) {
    const { data: ref } = await admin.from('blogs').select('*').eq('id', payload.fromReferenceId).maybeSingle();
    if (!ref) throw new Error('Reference not found');
    const slug = `${slugifyBlogTitle(payload.title)}-${Date.now().toString(36)}`;
    const { data, error } = await admin
      .from('blogs')
      .insert({
        title: payload.title.trim(),
        slug,
        content: payload.content.trim(),
        cover_image_url: payload.cover_image_url ?? null,
        author_id: user.id,
        status: 'DRAFT',
        ...meta,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    revalidatePath('/blogger');
    return mapRow(data as Record<string, unknown>);
  }

  if (payload.id) {
    const existing = await getBloggerBlog(payload.id);
    if (!existing) throw new Error('Blog not found');

    const { data, error } = await admin
      .from('blogs')
      .update({
        title: payload.title.trim(),
        content: payload.content.trim(),
        cover_image_url: payload.cover_image_url ?? null,
        status: 'DRAFT',
        updated_at: new Date().toISOString(),
        ...meta,
      })
      .eq('id', payload.id)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    revalidatePath('/blogger');
    return mapRow(data as Record<string, unknown>);
  }

  const slug = `${slugifyBlogTitle(payload.title)}-${Date.now().toString(36)}`;
  const { data, error } = await admin
    .from('blogs')
    .insert({
      title: payload.title.trim(),
      slug,
      content: payload.content.trim(),
      cover_image_url: payload.cover_image_url ?? null,
      author_id: user.id,
      status: 'DRAFT',
      ...meta,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/blogger');
  return mapRow(data as Record<string, unknown>);
}

async function isAdminUser(userId: string, email: string | undefined): Promise<boolean> {
  const { isAdminEmail } = await import('@/lib/auth/routing');
  if (isAdminEmail(email)) return true;
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  return data?.role === 'ADMIN';
}

export async function submitBloggerBlog(payload: {
  id?: string;
  title: string;
  content: string;
  cover_image_url?: string | null;
  inline_images?: string[];
  fromReferenceId?: string;
  category?: string | null;
  tags?: string[];
  share_linkedin?: boolean;
  share_instagram?: boolean;
  cover_image_alt?: string | null;
  social_caption?: string | null;
  auto_share_socials?: boolean;
  meta_description?: string | null;
  focus_keyword?: string | null;
  publishAt?: string | null;
}) {
  const user = await assertBloggerOrAdmin();
  const admin = createAdminClient();
  const meta = publishingFields({ ...payload, forPublish: true });

  // Admins bypass the approval queue — their posts go straight to PUBLISHED.
  const adminOverride = await isAdminUser(user.id, user.email ?? undefined);
  const submitStatus = adminOverride ? ('PUBLISHED' as const) : ('PENDING_APPROVAL' as const);

  const upsertPayload = {
    title: payload.title.trim(),
    content: payload.content.trim(),
    cover_image_url: payload.cover_image_url ?? null,
    inline_images: payload.inline_images ?? [],
    author_id: user.id,
    status: submitStatus,
    // Clear prior rejection notes on resubmit
    admin_feedback: null,
    rejection_reason: null,
    updated_at: new Date().toISOString(),
    ...(adminOverride ? { approved_at: new Date().toISOString(), approved_by: user.id } : {}),
    ...meta,
  };

  if (payload.id) {
    const existing = await getBloggerBlog(payload.id);
    if (!existing) throw new Error('Blog not found');

    const { data, error } = await admin
      .from('blogs')
      .update(upsertPayload)
      .eq('id', payload.id)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    revalidatePath('/blogger');
    revalidatePath('/admin-dashboard/blogs');
    revalidatePath('/blogs');
    return mapRow(data as Record<string, unknown>);
  }

  const slug = `${slugifyBlogTitle(payload.title)}-${Date.now().toString(36)}`;
  const { data, error } = await admin
    .from('blogs')
    .insert({
      ...upsertPayload,
      slug,
      ...(payload.fromReferenceId ? {} : {}),
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/blogger');
  revalidatePath('/admin-dashboard/blogs');
  return mapRow(data as Record<string, unknown>);
}

export async function updateBloggerBlog(payload: {
  id: string;
  title: string;
  content: string;
  cover_image_url?: string | null;
  submitForApproval?: boolean;
  category?: string | null;
  tags?: string[];
  share_linkedin?: boolean;
  share_instagram?: boolean;
  cover_image_alt?: string | null;
  social_caption?: string | null;
  auto_share_socials?: boolean;
  meta_description?: string | null;
  focus_keyword?: string | null;
  publishAt?: string | null;
}) {
  const existing = await getBloggerBlog(payload.id);
  if (!existing) throw new Error('Blog not found');

  if (payload.submitForApproval) {
    return submitBloggerBlog({
      id: payload.id,
      title: payload.title,
      content: payload.content,
      cover_image_url: payload.cover_image_url,
      category: payload.category,
      tags: payload.tags,
      share_linkedin: payload.share_linkedin,
      share_instagram: payload.share_instagram,
      cover_image_alt: payload.cover_image_alt,
      social_caption: payload.social_caption,
      auto_share_socials: payload.auto_share_socials,
      meta_description: payload.meta_description,
      focus_keyword: payload.focus_keyword,
      publishAt: payload.publishAt,
    });
  }

  const admin = createAdminClient();
  let nextStatus: BlogStatus = existing.status;
  if (existing.status === 'PUBLISHED') {
    nextStatus = 'PENDING_APPROVAL';
  } else if (existing.status === 'REJECTED') {
    nextStatus = 'DRAFT';
  } else if (existing.status === 'DRAFT') {
    nextStatus = 'DRAFT';
  }

  const meta = publishingFields(payload);

  const { data, error } = await admin
    .from('blogs')
    .update({
      title: payload.title.trim(),
      content: payload.content.trim(),
      cover_image_url: payload.cover_image_url ?? null,
      status: nextStatus,
      updated_at: new Date().toISOString(),
      ...meta,
    })
    .eq('id', payload.id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/blogger');
  revalidatePath('/admin-dashboard/blogs');
  revalidatePath('/blogs');
  return mapRow(data as Record<string, unknown>);
}

export async function deleteBloggerBlog(id: string) {
  const existing = await getBloggerBlog(id);
  if (!existing) throw new Error('Blog not found');
  if (existing.status === 'PUBLISHED') {
    throw new Error('Published posts cannot be deleted. Contact admin.');
  }

  const admin = createAdminClient();
  const { error } = await admin.from('blogs').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/blogger');
  revalidatePath('/admin-dashboard/blogs');
  return { success: true };
}

export async function uploadBloggerBlogCover(formData: FormData): Promise<string> {
  await assertBloggerOrAdmin();
  const file = formData.get('file');
  if (!file || typeof file === 'string') throw new Error('Cover image required');

  const supabase = await createClient();
  const blob = file as Blob;
  const ext = file instanceof File && file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
  const path = `covers/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from('blog-covers').upload(path, blob, { upsert: true });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('blog-covers').getPublicUrl(path);
  return data.publicUrl;
}

/** Upload an inline body image to the blog-inline bucket and return its public URL. */
export async function uploadBloggerInlineImage(formData: FormData): Promise<string> {
  await assertBloggerOrAdmin();
  const file = formData.get('file');
  if (!file || typeof file === 'string') throw new Error('Image file required');

  const supabase = await createClient();
  const blob = file as Blob;
  const ext = file instanceof File && file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
  const path = `inline/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from('blog-inline').upload(path, blob, { upsert: true });
  if (error) {
    // Fallback to blog-covers if inline bucket migration is not applied yet.
    const fallbackPath = `inline/${Date.now()}.${ext}`;
    const fallback = await supabase.storage.from('blog-covers').upload(fallbackPath, blob, { upsert: true });
    if (fallback.error) throw new Error(error.message);
    return supabase.storage.from('blog-covers').getPublicUrl(fallbackPath).data.publicUrl;
  }

  return supabase.storage.from('blog-inline').getPublicUrl(path).data.publicUrl;
}
