'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertAdmin } from '@/lib/auth/assert-admin';

export type AdminMessageRow = {
  id: string;
  sender_email: string;
  content: string;
  created_at: string;
};

export async function listAdminMessages(): Promise<AdminMessageRow[]> {
  await assertAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('admin_messages')
    .select('id, sender_email, content, created_at')
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) throw new Error(error.message);
  return (data ?? []) as AdminMessageRow[];
}

export async function sendAdminMessage(content: string) {
  const user = await assertAdmin();
  const trimmed = content.trim();
  if (!trimmed) throw new Error('Message cannot be empty');

  const supabase = await createClient();
  const { error } = await supabase.from('admin_messages').insert({
    sender_email: user.email ?? 'admin@oxyile.com',
    content: trimmed,
  });

  if (error) throw new Error(error.message);
  revalidatePath('/admin-dashboard/chat');
  return { success: true };
}
