'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ProfileRole } from '@/lib/types/profile';

export interface RecommendedProfile {
  id: string;
  role: ProfileRole;
  full_legal_name: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
}

export async function getRecommendedProfiles(): Promise<{
  profiles: RecommendedProfile[];
  title: string;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { profiles: [], title: 'Recommended Profiles', error: 'Not authenticated' };
  }

  const { data: me, error: meError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (meError || !me?.role) {
    return { profiles: [], title: 'Recommended Profiles', error: meError?.message ?? 'Profile not found' };
  }

  const targetRole: ProfileRole = me.role === 'INVESTOR' ? 'BORROWER' : 'INVESTOR';
  const title = me.role === 'INVESTOR' ? 'Recommended Borrowers' : 'Recommended Investors';

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .select('id, role, full_legal_name, username, bio, avatar_url, cover_url')
    .eq('status', 'APPROVED')
    .eq('role', targetRole)
    .neq('role', 'ADMIN')
    .neq('id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    return { profiles: [], title, error: error.message };
  }

  return { profiles: (data ?? []) as RecommendedProfile[], title };
}
