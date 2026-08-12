import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import {
  canAccessPath,
  getAuthRedirectPath,
  isAdminEmail,
  isAuthPage,
  isProtectedPath,
} from '@/lib/auth/routing';
import { getServerProfile } from '@/lib/auth/get-server-profile';
import { isApprovedStatus, isSuspendedAccount } from '@/lib/auth/profile-status';

function isStaffPortalPath(pathname: string): boolean {
  return (
    pathname.startsWith('/hr') ||
    pathname.startsWith('/blogger') ||
    pathname.startsWith('/social') ||
    pathname.startsWith('/admin-dashboard') ||
    pathname.startsWith('/employee/dashboard')
  );
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  supabaseResponse.headers.set('x-pathname', pathname);

  if (
    pathname.startsWith('/auth/callback') ||
    pathname === '/employee/login' ||
    pathname === '/employee/signup' ||
    pathname.startsWith('/employee/login/') ||
    pathname.startsWith('/employee/signup/') ||
    pathname === '/suspended'
  ) {
    return supabaseResponse;
  }

  let profile = null;

  if (user) {
    profile = await getServerProfile(supabase, user.id);
  }

  const email = user?.email ?? '';

  // Suspended borrowers/investors (and any suspended account): kill session immediately.
  if (user && profile && isSuspendedAccount(profile.account_status)) {
    await supabase.auth.signOut();
    const suspended = new URL('/suspended', request.url);
    const redirectResponse = NextResponse.redirect(suspended);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  // Revoked employees: if they hit staff portals and are no longer in allowed_employees, destroy session.
  if (user && email && isStaffPortalPath(pathname) && !isAdminEmail(email)) {
    const isElevated =
      profile?.role === 'ADMIN' ||
      profile?.role === 'HR' ||
      profile?.role === 'BLOGGER' ||
      profile?.role === 'SOCIAL_MANAGER' ||
      profile?.role === 'EMPLOYEE';

    if (isElevated) {
      const { data: employeeRow, error: employeeLookupError } = await supabase
        .from('allowed_employees')
        .select('email')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      // Skip hard logout when the directory table is not available yet (migration pending).
      if (!employeeLookupError && !employeeRow) {
        await supabase.auth.signOut();
        const login = new URL('/employee/login', request.url);
        login.searchParams.set('revoked', '1');
        const redirectResponse = NextResponse.redirect(login);
        supabaseResponse.cookies.getAll().forEach((cookie) => {
          redirectResponse.cookies.set(cookie.name, cookie.value);
        });
        return redirectResponse;
      }
    }
  }

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
