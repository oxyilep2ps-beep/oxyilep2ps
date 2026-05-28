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
  status: 'pending' | 'approved';
  created_at: string;
};

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

export async function approveBlog(id: string, updates?: { title?: string; content?: string }) {
  await assertAdmin();
  const admin = createAdminClient();
  const { data: user } = await admin.auth.getUser();

  const { error } = await admin
    .from('blogs')
    .update({
      ...(updates?.title ? { title: updates.title } : {}),
      ...(updates?.content ? { content: updates.content } : {}),
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
