'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/auth/assert-admin';
import { slugifyBlogTitle } from '@/lib/blog/slug';
import type { BlogRow } from '@/lib/blog/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAdminAction } from '@/app/actions/admin-audit';

function mapRow(row: Record<string, unknown>): BlogRow {
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
    approved_at: (row.approved_at as string | null) ?? null,
    approved_by: (row.approved_by as string | null) ?? null,
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

export async function listPublishedBlogs(): Promise<AdminBlogRow[]> {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('blogs')
    .select('*')
    .eq('status', 'PUBLISHED')
    .order('created_at', { ascending: false });

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

  const { data: blog } = await admin.from('blogs').select('title').eq('id', id).maybeSingle();

  const { error } = await admin
    .from('blogs')
    .update({
      ...(updates?.title ? { title: updates.title } : {}),
      ...(updates?.content ? { content: updates.content } : {}),
      ...(updates?.cover_image_url !== undefined ? { cover_image_url: updates.cover_image_url } : {}),
      status: 'PUBLISHED',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(error.message);

  await logAdminAction(user.email ?? 'admin', `Approved blog "${blog?.title ?? id}"`);
  revalidatePath('/blogs');
  revalidatePath('/admin-dashboard/blogs');
  revalidatePath('/blog');
  return { success: true };
}

export async function rejectBlog(id: string) {
  await assertAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from('blogs')
    .update({
      status: 'REJECTED',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/admin-dashboard/blogs');
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
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('blogs')
    .select('id, title, slug, content, cover_image_url, cover_image, created_at')
    .eq('status', 'PUBLISHED')
    .order('created_at', { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function getApprovedBlogBySlug(slug: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('blogs')
    .select('id, title, slug, content, cover_image_url, cover_image, created_at')
    .eq('slug', slug)
    .eq('status', 'PUBLISHED')
    .maybeSingle();
  return data;
}
