'use server';

import { revalidatePath } from 'next/cache';
import { assertBloggerOrAdmin } from '@/lib/auth/assert-blogger';
import { slugifyBlogTitle } from '@/lib/blog/slug';
import type { BlogRow, BlogStatus } from '@/lib/blog/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

function mapRow(row: Record<string, unknown>): BlogRow {
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
  };
}

export async function listBloggerBlogs(filter: 'drafts' | 'pending' | 'published' | 'references') {
  const user = await assertBloggerOrAdmin();
  const admin = createAdminClient();

  let query = admin.from('blogs').select('*').order('updated_at', { ascending: false });

  if (filter === 'references') {
    query = query.is('author_id', null).eq('status', 'DRAFT');
  } else if (filter === 'drafts') {
    query = query.eq('author_id', user.id).eq('status', 'DRAFT');
  } else if (filter === 'pending') {
    query = query.eq('author_id', user.id).eq('status', 'PENDING_APPROVAL');
  } else {
    query = query.eq('author_id', user.id).eq('status', 'PUBLISHED');
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
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
}) {
  const user = await assertBloggerOrAdmin();
  const admin = createAdminClient();

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
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/blogger');
  return mapRow(data as Record<string, unknown>);
}

export async function submitBloggerBlog(payload: {
  id?: string;
  title: string;
  content: string;
  cover_image_url?: string | null;
  fromReferenceId?: string;
}) {
  const user = await assertBloggerOrAdmin();
  const admin = createAdminClient();

  const upsertPayload = {
    title: payload.title.trim(),
    content: payload.content.trim(),
    cover_image_url: payload.cover_image_url ?? null,
    author_id: user.id,
    status: 'PENDING_APPROVAL' as const,
    updated_at: new Date().toISOString(),
  };

  if (payload.id) {
    const existing = await getBloggerBlog(payload.id);
    if (!existing) throw new Error('Blog not found');

    const nextStatus =
      existing.status === 'PUBLISHED' ? 'PENDING_APPROVAL' : 'PENDING_APPROVAL';

    const { data, error } = await admin
      .from('blogs')
      .update({ ...upsertPayload, status: nextStatus })
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
}) {
  const existing = await getBloggerBlog(payload.id);
  if (!existing) throw new Error('Blog not found');

  if (payload.submitForApproval) {
    return submitBloggerBlog({
      id: payload.id,
      title: payload.title,
      content: payload.content,
      cover_image_url: payload.cover_image_url,
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

  const { data, error } = await admin
    .from('blogs')
    .update({
      title: payload.title.trim(),
      content: payload.content.trim(),
      cover_image_url: payload.cover_image_url ?? null,
      status: nextStatus,
      updated_at: new Date().toISOString(),
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
