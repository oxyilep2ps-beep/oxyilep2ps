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
  void email;
  const status = normalizeProfileStatus(profile?.status as string | undefined);

  if (!profile || isPendingStatus(status)) {
    return '/pending-verification';
  }

  if (isApprovedStatus(status)) {
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
  '/user',
  '/payments',
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
  // Admins can access the full staff surface (admin + HR + blogger + social + employee portals).
  if (isAdminEmail(email) || profile?.role === 'ADMIN') {
    return (
      pathname.startsWith('/feed') ||
      pathname.startsWith('/chats') ||
      pathname.startsWith('/chat') ||
      pathname.startsWith('/admin-dashboard') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/hr') ||
      pathname.startsWith('/portal') ||
      pathname.startsWith('/blogger') ||
      pathname.startsWith('/social') ||
      pathname.startsWith('/employee/dashboard') ||
      pathname.startsWith('/payments/mandate-complete') ||
      pathname.startsWith('/payments/sandbox')
    );
  }

  // HR is scoped to the HR portal only.
  if (isHrStaffEmail(email) || profile?.role === 'HR') {
    return (
      pathname.startsWith('/feed') ||
      pathname.startsWith('/chats') ||
      pathname.startsWith('/chat') ||
      pathname.startsWith('/hr') ||
      pathname.startsWith('/portal')
    );
  }

  // Bloggers are scoped to the blogger CMS only (/blogger — existing route).
  if (isBloggerStaffEmail(email) || profile?.role === 'BLOGGER') {
    return pathname.startsWith('/feed') || pathname.startsWith('/chats') || pathname.startsWith('/chat') || pathname.startsWith('/blogger');
  }

  // Social Media Managers are scoped to the Social Manager Portal.
  if (profile?.role === 'SOCIAL_MANAGER') {
    return pathname.startsWith('/feed') || pathname.startsWith('/chats') || pathname.startsWith('/chat') || pathname.startsWith('/social');
  }

  // Standard employees are scoped to the Employee Portal.
  if (profile?.role === 'EMPLOYEE') {
    return pathname.startsWith('/feed') || pathname.startsWith('/chats') || pathname.startsWith('/chat') || pathname.startsWith('/employee/dashboard');
  }

  const status = normalizeProfileStatus(profile?.status as string | undefined);

  if (isPendingStatus(status)) {
    return pathname.startsWith('/pending-verification');
  }

  if (isApprovedStatus(status)) {
    if (profile?.role === 'INVESTOR' || profile?.role === 'BORROWER') {
      return (
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/chats') ||
        pathname.startsWith('/chat') ||
        pathname.startsWith('/feed') ||
        pathname.startsWith('/user/') ||
        pathname.startsWith('/payments/mandate-complete') ||
        pathname.startsWith('/payments/sandbox')
      );
    }
  }

  return false;
}
