import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerProfile } from '@/lib/auth/get-server-profile';
import { isApprovedStatus } from '@/lib/auth/profile-status';
import { isAdminEmail } from '@/lib/auth/routing';

/** Redirects non-approved investors/borrowers away from gated features (chat, handshakes). */
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
    redirect('/signup');
  }

  const email = user.email ?? profile.email ?? '';
  if (isAdminEmail(email) || profile.role === 'ADMIN') {
    redirect('/admin-dashboard');
  }

  if (!isApprovedStatus(profile.status)) {
    redirect('/pending-verification');
  }

  return { user, profile };
}
