'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertAdmin } from '@/lib/auth/assert-admin';

export type GlobalAnnouncement = {
  id: string;
  title: string;
  body: string;
  emoji: string;
  pinned: boolean;
  author_id: string | null;
  created_at: string;
};

export async function listGlobalAnnouncements(limit = 20): Promise<GlobalAnnouncement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('global_announcements')
    .select('id, title, body, emoji, pinned, author_id, created_at')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[listGlobalAnnouncements]', error.message);
    return [];
  }
  return (data ?? []) as GlobalAnnouncement[];
}

export async function createGlobalAnnouncement(input: {
  title: string;
  body: string;
  emoji?: string;
  pinned?: boolean;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const user = await assertAdmin();
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('global_announcements')
      .insert({
        title: input.title.trim(),
        body: input.body.trim(),
        emoji: input.emoji?.trim() || '📢',
        pinned: Boolean(input.pinned),
        author_id: user.id,
      })
      .select('id')
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, id: String(data.id) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create announcement' };
  }
}

export async function deleteGlobalAnnouncement(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertAdmin();
    const admin = createAdminClient();
    const { error } = await admin.from('global_announcements').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Delete failed' };
  }
}
