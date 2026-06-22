import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth/routing';
import type { User } from '@supabase/supabase-js';

/** Verify the current request is from an authenticated admin (API routes). */
export async function verifyAdminRequest(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  if (isAdminEmail(user.email)) return user;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role === 'ADMIN') return user;

  return null;
}
