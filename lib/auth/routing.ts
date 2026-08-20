import type { Profile } from '@/lib/types/profile';
import { isApprovedStatus, isPendingStatus, normalizeProfileStatus } from '@/lib/auth/profile-status';
import { isBloggerStaffEmail, isHrStaffEmail } from '@/lib/auth/role-emails';

/** Comma-separated list from ADMIN_EMAIL env. */
export function getAdminEmails(): string[] {
  const raw =
    process.env.ADMIN_EMAIL ??
    'showlittlemercy@gmail.com,preet.datta@oxyile.com,jay.bonde@oxyile.com';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}

/** @deprecated Use isHrStaffEmail */
export function isSuperHrEmail(email: string | undefined | null): boolean {
  return isHrStaffEmail(email);
}

/** Post-login / post-signup redirect target from profile + email. */
export function getAuthRedirectPath(
  profile: Pick<Profile, 'role' | 'status'> | null,
  email: string
): string {
  if (isAdminEmail(email) || profile?.role === 'ADMIN') return '/admin-dashboard/command';
  if (isHrStaffEmail(email) || profile?.role === 'HR') return '/hr';
  if (isBloggerStaffEmail(email) || profile?.role === 'BLOGGER') return '/blogger';
  if (profile?.role === 'SOCIAL_MANAGER') return '/social';
  if (profile?.role === 'EMPLOYEE') return '/employee/dashboard';

  const status = normalizeProfileStatus(profile?.status as string | undefined);

  if (!profile || isPendingStatus(status)) {
    return '/pending-verification';
  }

  if (isApprovedStatus(status)) {
    // Chat-first landing for approved borrowers & investors.
    if (profile.role === 'BORROWER' || profile.role === 'INVESTOR') return '/chat';
    return '/feed';
  }

  return '/pending-verification';
}

export const PROTECTED_PREFIXES = [
  '/admin-dashboard',
  '/admin',
  '/hr',
  '/portal',
  '/blogger',
  '/social',
  '/employee/dashboard',
  '/pending-verification',
  '/dashboard',
  '/chats',
  '/chat',
  '/feed',
  '/search',
  '/profile',
  '/user',
  '/payments',
  '/settings',
] as const;

export const AUTH_PAGES = ['/signin', '/signup'] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function canAccessPath(
  pathname: string,
  profile: Pick<Profile, 'role' | 'status'> | null,
  email: string
): boolean {
  const socialSurface =
    pathname.startsWith('/feed') ||
    pathname.startsWith('/chats') ||
    pathname.startsWith('/chat') ||
    pathname.startsWith('/search') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/user/');

  // Admins can access the full staff surface + View As into borrower/investor dashboards.
  if (isAdminEmail(email) || profile?.role === 'ADMIN') {
    return (
      socialSurface ||
      pathname.startsWith('/admin-dashboard') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/hr') ||
      pathname.startsWith('/portal') ||
      pathname.startsWith('/blogger') ||
      pathname.startsWith('/social') ||
      pathname.startsWith('/employee/dashboard') ||
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/payments/mandate-complete') ||
      pathname.startsWith('/payments/sandbox')
    );
  }

  // HR is scoped to the HR portal only.
  if (isHrStaffEmail(email) || profile?.role === 'HR') {
    return socialSurface || pathname.startsWith('/hr') || pathname.startsWith('/portal');
  }

  // Bloggers are scoped to the blogger CMS only (/blogger — existing route).
  if (isBloggerStaffEmail(email) || profile?.role === 'BLOGGER') {
    return socialSurface || pathname.startsWith('/blogger');
  }

  // Social Media Managers are scoped to the Social Manager Portal.
  if (profile?.role === 'SOCIAL_MANAGER') {
    return socialSurface || pathname.startsWith('/social');
  }

  // Standard employees are scoped to the Employee Portal.
  if (profile?.role === 'EMPLOYEE') {
    return socialSurface || pathname.startsWith('/employee/dashboard');
  }

  const status = normalizeProfileStatus(profile?.status as string | undefined);

  if (isPendingStatus(status)) {
    return pathname.startsWith('/pending-verification');
  }

  if (isApprovedStatus(status)) {
    if (profile?.role === 'INVESTOR' || profile?.role === 'BORROWER') {
      return (
        socialSurface ||
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/payments/mandate-complete') ||
        pathname.startsWith('/payments/sandbox')
      );
    }
  }

  return false;
}
