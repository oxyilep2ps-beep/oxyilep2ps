'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type HeaderProfile = {
  name: string;
  email: string;
  avatarUrl: string | null;
};

export async function getHeaderProfile(): Promise<HeaderProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('full_legal_name, email, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  const email = String(profile?.email ?? user.email ?? '').trim();
  const name = String(profile?.full_legal_name ?? email.split('@')[0] ?? '').trim();

  return {
    name: name || 'User',
    email: email || 'No email',
    avatarUrl: (profile?.avatar_url as string | null) ?? null,
  };
}
