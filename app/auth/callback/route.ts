import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthRedirectPath } from '@/lib/auth/routing';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (next.startsWith('/reset-password') || next.startsWith('/forgot-password')) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('id', user.id)
          .maybeSingle();
        const dest = getAuthRedirectPath(profile, user.email ?? '');
        return NextResponse.redirect(`${origin}${dest}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/signin?error=auth_callback_failed`);
}
