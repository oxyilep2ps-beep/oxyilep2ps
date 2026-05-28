import type { Profile } from '@/lib/types/profile';
import { isApprovedStatus, isPendingStatus, normalizeProfileStatus } from '@/lib/auth/profile-status';

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

const SUPER_HR_EMAIL = 'flacmily@gmail.com';

export function isSuperHrEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPER_HR_EMAIL;
}

/** Post-login / post-signup redirect target from profile + email. */
export function getAuthRedirectPath(
  profile: Pick<Profile, 'role' | 'status'> | null,
  email: string
): string {
  if (isAdminEmail(email) || profile?.role === 'ADMIN') {
    return '/admin-dashboard';
  }

  if (isSuperHrEmail(email) || profile?.role === 'HR') {
    return '/hr';
  }

  const status = normalizeProfileStatus(profile?.status as string | undefined);

  if (!profile || isPendingStatus(status)) {
    return '/pending-verification';
  }

  if (isApprovedStatus(status)) {
    if (profile.role === 'INVESTOR' || profile.role === 'BORROWER') return '/dashboard';
    if (profile.role === 'ADMIN') return '/admin-dashboard';
  }

  return '/pending-verification';
}

export const PROTECTED_PREFIXES = [
  '/admin-dashboard',
  '/hr',
  '/pending-verification',
  '/dashboard',
  '/chats',
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
  if (isAdminEmail(email) || profile?.role === 'ADMIN') {
    return (
      pathname.startsWith('/admin-dashboard') ||
      pathname.startsWith('/payments/mandate-complete')
    );
  }

  if (isSuperHrEmail(email) || profile?.role === 'HR') {
    return pathname.startsWith('/hr');
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
        pathname.startsWith('/user/') ||
        pathname.startsWith('/payments/mandate-complete')
      );
    }
  }

  return false;
}
