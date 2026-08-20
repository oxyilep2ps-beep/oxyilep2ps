import type { PortalId } from '@/components/shared/universal-dashboard-layout';
import type { MemberRole } from '@/lib/chat/types';
import type { ProfileRole } from '@/lib/types/profile';

export const ACTIVE_PORTAL_COOKIE = 'oxyile_active_portal';
export const ACTIVE_PORTAL_STORAGE_KEY = 'oxyile_active_portal';

export type FinancialCapabilities = {
  is_investor: boolean;
  is_borrower: boolean;
};

export type ProfileWithCapabilities = {
  role: string;
  is_investor?: boolean | null;
  is_borrower?: boolean | null;
};

const STAFF_ROLES = new Set(['ADMIN', 'HR', 'BLOGGER', 'SOCIAL_MANAGER', 'EMPLOYEE']);

export function normalizeSystemRole(role: string | null | undefined): string {
  return String(role ?? '')
    .trim()
    .toUpperCase();
}

/** True financial capability — role alone is no longer enough for staff dual-access. */
export function resolveFinancialCapabilities(
  profile: ProfileWithCapabilities | null | undefined
): FinancialCapabilities {
  const role = normalizeSystemRole(profile?.role);
  const fromFlags = {
    is_investor: Boolean(profile?.is_investor),
    is_borrower: Boolean(profile?.is_borrower),
  };

  // Legacy rows / pending migration: fall back to primary role.
  if (!fromFlags.is_investor && !fromFlags.is_borrower) {
    if (role === 'INVESTOR') return { is_investor: true, is_borrower: false };
    if (role === 'BORROWER') return { is_investor: false, is_borrower: true };
    // Admins historically used View As into both portals.
    if (role === 'ADMIN') return { is_investor: true, is_borrower: true };
  }

  return fromFlags;
}

export function hasAnyFinancialCapability(caps: FinancialCapabilities): boolean {
  return caps.is_investor || caps.is_borrower;
}

export function canActAsInvestor(profile: ProfileWithCapabilities | null | undefined): boolean {
  return resolveFinancialCapabilities(profile).is_investor;
}

export function canActAsBorrower(profile: ProfileWithCapabilities | null | undefined): boolean {
  return resolveFinancialCapabilities(profile).is_borrower;
}

/** Opposite P2P pairing based on capabilities (not system role). */
export function canFormHandshakePair(
  a: FinancialCapabilities,
  b: FinancialCapabilities
): boolean {
  return (a.is_investor && b.is_borrower) || (a.is_borrower && b.is_investor);
}

export function isStaffSystemRole(role: string | null | undefined): boolean {
  return STAFF_ROLES.has(normalizeSystemRole(role));
}

export function isValidPortalId(value: string | null | undefined): value is PortalId {
  return (
    value === 'admin' ||
    value === 'hr' ||
    value === 'blogger' ||
    value === 'social' ||
    value === 'borrower' ||
    value === 'investor' ||
    value === 'employee'
  );
}

/** Map active portal → handshake stance used by ChatRoom / HandshakePanel. */
export function financialStanceFromPortal(
  portal: PortalId | string | null | undefined,
  caps: FinancialCapabilities
): MemberRole | null {
  if (portal === 'investor' && caps.is_investor) return 'INVESTOR';
  if (portal === 'borrower' && caps.is_borrower) return 'BORROWER';
  if (caps.is_investor && !caps.is_borrower) return 'INVESTOR';
  if (caps.is_borrower && !caps.is_investor) return 'BORROWER';
  if (caps.is_investor) return 'INVESTOR';
  if (caps.is_borrower) return 'BORROWER';
  return null;
}

export function defaultPortalForRole(role: ProfileRole | string): PortalId {
  const r = normalizeSystemRole(role);
  if (r === 'ADMIN') return 'admin';
  if (r === 'HR') return 'hr';
  if (r === 'BLOGGER') return 'blogger';
  if (r === 'SOCIAL_MANAGER') return 'social';
  if (r === 'EMPLOYEE') return 'employee';
  if (r === 'BORROWER') return 'borrower';
  if (r === 'INVESTOR') return 'investor';
  return 'admin';
}

export function setActivePortalClient(portal: PortalId) {
  if (typeof document === 'undefined') return;
  document.cookie = `${ACTIVE_PORTAL_COOKIE}=${portal}; Path=/; Max-Age=${60 * 60 * 24 * 180}; SameSite=Lax`;
  try {
    window.localStorage.setItem(ACTIVE_PORTAL_STORAGE_KEY, portal);
  } catch {
    // ignore quota / private mode
  }
  window.dispatchEvent(new CustomEvent('oxyile:active-portal', { detail: { portal } }));
}

export function readActivePortalClient(): PortalId | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(ACTIVE_PORTAL_STORAGE_KEY);
    if (isValidPortalId(stored)) return stored;
  } catch {
    // ignore
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${ACTIVE_PORTAL_COOKIE}=([^;]*)`));
  const value = match?.[1] ? decodeURIComponent(match[1]) : null;
  return isValidPortalId(value) ? value : null;
}
