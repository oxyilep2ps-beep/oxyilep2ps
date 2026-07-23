import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import {
  canAccessPath,
  getAuthRedirectPath,
  isAuthPage,
  isProtectedPath,
} from '@/lib/auth/routing';
import { getServerProfile } from '@/lib/auth/get-server-profile';
import { isApprovedStatus } from '@/lib/auth/profile-status';

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  supabaseResponse.headers.set('x-pathname', pathname);

  if (pathname.startsWith('/auth/callback')) {
    return supabaseResponse;
  }

  let profile = null;

  if (user) {
    profile = await getServerProfile(supabase, user.id);
  }

  const email = user?.email ?? '';

  if (user && profile && isApprovedStatus(profile.status) && pathname.startsWith('/pending-verification')) {
    const dest = getAuthRedirectPath(profile, email);
    const redirectResponse = NextResponse.redirect(new URL(dest, request.url));
    redirectResponse.headers.set('x-pathname', dest);
    return redirectResponse;
  }

  if (user && isAuthPage(pathname)) {
    const dest = getAuthRedirectPath(profile, email);
    const redirectResponse = NextResponse.redirect(new URL(dest, request.url));
    redirectResponse.headers.set('x-pathname', dest);
    return redirectResponse;
  }

  if (!user && isProtectedPath(pathname)) {
    const signIn = new URL('/signin', request.url);
    signIn.searchParams.set('redirect', pathname);
    return NextResponse.redirect(signIn);
  }

  // Role-scoped protection: Admins → all staff portals; HR → /hr; Blogger → /blogger.
  // Roles come from profiles.role (seeded / platform_access) and hardcoded ADMIN_EMAIL / staff emails.
  if (user && isProtectedPath(pathname) && !canAccessPath(pathname, profile, email)) {
    const dest = getAuthRedirectPath(profile, email);
    if (pathname !== dest) {
      const redirectResponse = NextResponse.redirect(new URL(dest, request.url));
      redirectResponse.headers.set('x-pathname', dest);
      return redirectResponse;
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
