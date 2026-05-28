'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/auth/assert-admin';
import { createAdminClient } from '@/lib/supabase/admin';

export type AdminBlogRow = {
  id: string;
  title: string;
  slug: string;
  content: string;
  cover_image: string | null;
  author_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export async function listPendingBlogs(): Promise<AdminBlogRow[]> {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('blogs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AdminBlogRow[];
}

export async function listPublishedBlogs(): Promise<AdminBlogRow[]> {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('blogs')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AdminBlogRow[];
}

export async function createAdminBlog(payload: { title: string; content: string; cover_image?: string | null }) {
  const user = await assertAdmin();
  const admin = createAdminClient();
  const slug = `${slugify(payload.title)}-${Date.now().toString(36)}`;

  const { error } = await admin.from('blogs').insert({
    title: payload.title.trim(),
    slug,
    content: payload.content.trim(),
    cover_image: payload.cover_image ?? null,
    author_id: user.id,
    status: 'approved',
    approved_at: new Date().toISOString(),
    approved_by: user.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath('/blogs');
  revalidatePath('/admin-dashboard/blogs');
  return { success: true, slug };
}

export async function approveBlog(id: string, updates?: { title?: string; content?: string; cover_image?: string | null }) {
  await assertAdmin();
  const admin = createAdminClient();
  const { data: user } = await admin.auth.getUser();

  const { error } = await admin
    .from('blogs')
    .update({
      ...(updates?.title ? { title: updates.title } : {}),
      ...(updates?.content ? { content: updates.content } : {}),
      ...(updates?.cover_image !== undefined ? { cover_image: updates.cover_image } : {}),
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user?.user?.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/blogs');
  revalidatePath('/admin-dashboard/blogs');
  return { success: true };
}

export async function rejectBlog(id: string) {
  await assertAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from('blogs')
    .update({
      status: 'rejected',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/admin-dashboard/blogs');
  return { success: true };
}

export async function listApprovedBlogsPublic() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('blogs')
    .select('id, title, slug, content, cover_image, created_at')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function getApprovedBlogBySlug(slug: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('blogs')
    .select('id, title, slug, content, cover_image, created_at')
    .eq('slug', slug)
    .eq('status', 'approved')
    .maybeSingle();
  return data;
}
