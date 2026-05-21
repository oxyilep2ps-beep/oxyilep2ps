import type { ProfileRole, ProfileStatus } from '@/lib/types/profile';

export type ProfileAuthRow = {
  id: string;
  role: ProfileRole;
  status: ProfileStatus;
  email?: string;
};

/** Normalize DB enum/text so `approved`, ` APPROVED `, etc. still match. */
export function normalizeProfileStatus(raw: string | null | undefined): ProfileStatus | null {
  if (!raw) return null;
  const value = raw.toString().trim().toUpperCase();
  if (value === 'APPROVED' || value === 'PENDING') return value;
  return null;
}

export function isApprovedStatus(raw: string | null | undefined): boolean {
  return normalizeProfileStatus(raw) === 'APPROVED';
}

export function isPendingStatus(raw: string | null | undefined): boolean {
  return normalizeProfileStatus(raw) === 'PENDING';
}
