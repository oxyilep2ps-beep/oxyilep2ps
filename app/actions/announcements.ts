'use server';

import { createClient } from '@/lib/supabase/server';

export type Announcement = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};

export async function getRecentAnnouncements(limit = 10): Promise<{
  announcements: Announcement[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, content, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { announcements: [], error: error.message };
  }

  return { announcements: (data ?? []) as Announcement[] };
}
