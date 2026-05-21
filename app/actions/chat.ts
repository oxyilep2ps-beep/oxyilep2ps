'use server';

import { createClient } from '@/lib/supabase/server';

export async function getUnreadMessageCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('receiver_id', user.id)
    .eq('is_read', false);

  if (error) {
    console.error('[getUnreadMessageCount]', error.message);
    return 0;
  }

  return count ?? 0;
}

export async function markConversationRead(peerUserId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: 'Not authenticated' };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true, read_at: now })
    .eq('receiver_id', user.id)
    .eq('sender_id', peerUserId)
    .eq('is_read', false);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
