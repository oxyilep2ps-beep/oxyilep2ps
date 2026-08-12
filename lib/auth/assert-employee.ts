import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth/routing';

export async function assertEmployeeOrAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  if (isAdminEmail(user.email)) return user;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'EMPLOYEE' && profile?.role !== 'ADMIN') {
    throw new Error('Employee access required');
  }

  return user;
}

export async function assertEmployee() {
  const user = await assertEmployeeOrAdmin();
  return user;
}
