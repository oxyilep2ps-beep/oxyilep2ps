import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerProfile } from '@/lib/auth/get-server-profile';
import { isApprovedStatus } from '@/lib/auth/profile-status';

/** Redirects non-approved users away from authenticated social surfaces. */
export async function requireApprovedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin');
  }

  const profile = await getServerProfile(supabase, user.id);
  if (!profile) {
    redirect('/pending-verification?confirmed=1');
  }

  if (!isApprovedStatus(profile.status)) {
    redirect('/pending-verification');
  }

  return { user, profile };
}
