import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import {
  canAccessPath,
  getAuthRedirectPath,
  isAdminEmail,
  isAuthPage,
  isProtectedPath,
  isSuperHrEmail,
} from '@/lib/auth/routing';
import { isBloggerStaffEmail, isHrStaffEmail } from '@/lib/auth/role-emails';
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

  if (user && isProtectedPath(pathname)) {
    const allowed =
      isAdminEmail(email) ||
      isHrStaffEmail(email) ||
      isBloggerStaffEmail(email) ||
      isSuperHrEmail(email) ||
      profile?.role === 'ADMIN' ||
      (profile ? canAccessPath(pathname, profile, email) : false);

    if (!allowed && profile) {
      const dest = getAuthRedirectPath(profile, email);
      if (pathname !== dest) {
        const redirectResponse = NextResponse.redirect(new URL(dest, request.url));
        redirectResponse.headers.set('x-pathname', dest);
        return redirectResponse;
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
