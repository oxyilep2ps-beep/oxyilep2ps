'use server';

import { revalidatePath } from 'next/cache';
import { assertHrOrAdmin } from '@/lib/auth/assert-hr';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export async function submitHrBlog(payload: {
  title: string;
  content: string;
  cover_image?: string | null;
}) {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  const baseSlug = slugify(payload.title);
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  const { error } = await admin.from('blogs').insert({
    title: payload.title.trim(),
    slug,
    content: payload.content.trim(),
    cover_image_url: payload.cover_image ?? null,
    author_id: user.id,
    status: 'PENDING_APPROVAL',
  });

  if (error) throw new Error(error.message);
  revalidatePath('/hr/blogs');
  revalidatePath('/admin-dashboard/blogs');
  return { success: true, slug };
}

export async function uploadBlogCover(formData: FormData): Promise<string> {
  await assertHrOrAdmin();
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

export async function listHrBlogs() {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('blogs')
    .select('id, title, slug, status, created_at, cover_image')
    .eq('author_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}
