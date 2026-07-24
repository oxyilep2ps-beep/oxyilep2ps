import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthRedirectPath } from '@/lib/auth/routing';
import { getPlatformAccessRole } from '@/lib/auth/platform-access';
import type { Profile } from '@/lib/types/profile';

/**
 * Supabase email-confirmation / OAuth callback.
 * On success: exchange code → load profile (service-role fallback) → redirect
 * to the correct post-auth destination. NEVER send confirmed users to /signup.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '';

  if (!code) {
    return NextResponse.redirect(`${origin}/signin?error=auth_callback_failed`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message);
    return NextResponse.redirect(`${origin}/signin?error=auth_callback_failed`);
  }

  // Password-reset flows keep their dedicated next target.
  if (next.startsWith('/reset-password') || next.startsWith('/forgot-password')) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/signin?error=auth_callback_failed`);
  }

  const admin = createAdminClient();

  // Ensure auth.users is marked confirmed after a successful callback exchange.
  // Covers legacy accounts created with email_confirm: false that still hit this route.
  if (!user.email_confirmed_at) {
    const { error: confirmError } = await admin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });
    if (confirmError) {
      console.error('[auth/callback] email_confirm update failed:', confirmError.message);
    }
  }

  const elevatedRole = await getPlatformAccessRole(user.email);

  if (elevatedRole) {
    const fullLegalName =
      (typeof user.user_metadata?.full_legal_name === 'string' &&
        user.user_metadata.full_legal_name.trim()) ||
      (typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
      user.email?.split('@')[0] ||
      elevatedRole;

    await admin.from('profiles').upsert(
      {
        id: user.id,
        email: user.email,
        full_legal_name: fullLegalName,
        role: elevatedRole,
        status: 'APPROVED',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  }

  // Prefer service-role read so RLS cannot hide a just-created profile.
  let profile: Pick<Profile, 'role' | 'status'> | null = null;
  const { data: adminProfile } = await admin
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle();

  if (adminProfile) {
    profile = adminProfile as Pick<Profile, 'role' | 'status'>;
  } else {
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .maybeSingle();
    profile = (userProfile as Pick<Profile, 'role' | 'status'> | null) ?? null;
  }

  // Explicit next only when it is a safe in-app path (not /signup).
  if (
    next.startsWith('/') &&
    !next.startsWith('//') &&
    !next.startsWith('/signup') &&
    !next.startsWith('/signin')
  ) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const dest = getAuthRedirectPath(profile, user.email ?? '');
  // Pending borrowers/investors land on pending-verification with a confirmed flag.
  const url = new URL(dest, origin);
  if (dest === '/pending-verification') {
    url.searchParams.set('confirmed', '1');
  }

  return NextResponse.redirect(url.toString());
}
