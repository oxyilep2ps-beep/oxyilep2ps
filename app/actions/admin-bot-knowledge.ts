'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/auth/assert-admin';
import { createAdminClient } from '@/lib/supabase/admin';

export type BotKnowledgeRow = {
  id: string;
  keyword_string: string;
  answer_text: string;
  created_at: string;
};

export async function listBotKnowledge(): Promise<BotKnowledgeRow[]> {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from('bot_knowledge').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as BotKnowledgeRow[];
}

export async function upsertBotKnowledge(payload: { id?: string; keyword_string: string; answer_text: string }) {
  await assertAdmin();
  const admin = createAdminClient();

  if (payload.id) {
    const { error } = await admin
      .from('bot_knowledge')
      .update({
        keyword_string: payload.keyword_string.trim(),
        answer_text: payload.answer_text.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin.from('bot_knowledge').insert({
      keyword_string: payload.keyword_string.trim(),
      answer_text: payload.answer_text.trim(),
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath('/admin-dashboard/oliver');
  return { success: true };
}

export async function deleteBotKnowledge(id: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('bot_knowledge').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin-dashboard/oliver');
  return { success: true };
}
