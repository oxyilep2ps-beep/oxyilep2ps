'use server';

import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth/routing';

export async function assertHrOrAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) throw new Error('Unauthorized');

  if (isAdminEmail(user.email)) return user;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();

  if (profile?.role !== 'HR' && profile?.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  return user;
}
