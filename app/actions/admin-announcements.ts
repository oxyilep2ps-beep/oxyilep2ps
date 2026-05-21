'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertAdmin } from '@/lib/auth/assert-admin';

export type AdminAnnouncement = {
  id: string;
  title: string;
  content: string;
  admin_author: string | null;
  created_at: string;
};

export async function listAdminAnnouncements(): Promise<AdminAnnouncement[]> {
  await assertAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('announcements')
    .select('id, title, content, admin_author, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AdminAnnouncement[];
}

export async function createAdminAnnouncement(title: string, content: string) {
  const user = await assertAdmin();
  const admin = createAdminClient();

  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();
  if (!trimmedTitle || !trimmedContent) {
    throw new Error('Title and content are required.');
  }

  const { data, error } = await admin
    .from('announcements')
    .insert({
      title: trimmedTitle,
      content: trimmedContent,
      admin_author: user.id,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/admin-dashboard');
  revalidatePath('/dashboard');
  return { success: true, id: data.id as string };
}

export async function deleteAdminAnnouncement(id: string) {
  await assertAdmin();
  const admin = createAdminClient();

  const { error } = await admin.from('announcements').delete().eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/admin-dashboard');
  revalidatePath('/dashboard');
  return { success: true };
}
