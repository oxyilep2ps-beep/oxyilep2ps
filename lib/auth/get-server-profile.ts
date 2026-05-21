import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeProfileStatus, type ProfileAuthRow } from '@/lib/auth/profile-status';
import type { ProfileRole } from '@/lib/types/profile';

export async function getServerProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileAuthRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, status, email')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.error('[getServerProfile]', error?.message ?? 'Profile row missing');
    return null;
  }

  const status = normalizeProfileStatus(data.status as string);
  if (!status) {
    console.error('[getServerProfile] Unrecognized status value:', data.status);
    return null;
  }

  return {
    id: data.id,
    role: data.role as ProfileRole,
    status,
    email: data.email as string | undefined,
  };
}
