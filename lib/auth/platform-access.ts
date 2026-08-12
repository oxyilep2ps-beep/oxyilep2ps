import { createAdminClient } from '@/lib/supabase/admin';
import type { ProfileRole } from '@/lib/types/profile';
import { isAdminEmail } from '@/lib/auth/routing';
import { isBloggerStaffEmail, isHrStaffEmail, type StaffRole } from '@/lib/auth/role-emails';

export type ElevatedPlatformRole = 'ADMIN' | 'HR' | 'BLOGGER' | 'SOCIAL_MANAGER' | 'EMPLOYEE';

/** Resolve elevated role from hardcoded staff emails + ADMIN_EMAIL env (no DB). */
export function elevatedRoleFromHardcodedEmail(email: string | undefined | null): ElevatedPlatformRole | null {
  if (!email) return null;
  if (isAdminEmail(email)) return 'ADMIN';
  if (isHrStaffEmail(email)) return 'HR';
  if (isBloggerStaffEmail(email)) return 'BLOGGER';
  return null;
}

/** Look up a pre-authorized / granted role from platform_access + allowed_employees. */
export async function getPlatformAccessRole(email: string | undefined | null): Promise<ElevatedPlatformRole | null> {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const hardcoded = elevatedRoleFromHardcodedEmail(normalized);
  if (hardcoded) return hardcoded;

  try {
    const admin = createAdminClient();

    const { data: employee } = await admin
      .from('allowed_employees')
      .select('role')
      .eq('email', normalized)
      .maybeSingle();

    if (employee?.role) {
      const mapped = String(employee.role).toLowerCase();
      if (mapped === 'admin') return 'ADMIN';
      if (mapped === 'hr') return 'HR';
      if (mapped === 'blogger') return 'BLOGGER';
      if (mapped === 'social_manager') return 'SOCIAL_MANAGER';
      if (mapped === 'employee') return 'EMPLOYEE';
    }

    const { data } = await admin
      .from('platform_access')
      .select('role')
      .eq('email', normalized)
      .maybeSingle();

    const role = data?.role as string | undefined;
    if (
      role === 'ADMIN' ||
      role === 'HR' ||
      role === 'BLOGGER' ||
      role === 'SOCIAL_MANAGER' ||
      role === 'EMPLOYEE'
    ) {
      return role;
    }
  } catch {
    // Table may not exist yet before migration — fall through
  }

  return null;
}

export function staffRoleFromElevated(role: ElevatedPlatformRole | null): StaffRole | null {
  if (role === 'HR' || role === 'BLOGGER') return role;
  return null;
}

export function isElevatedProfileRole(role: ProfileRole | string | null | undefined): boolean {
  return (
    role === 'ADMIN' ||
    role === 'HR' ||
    role === 'BLOGGER' ||
    role === 'SOCIAL_MANAGER' ||
    role === 'EMPLOYEE'
  );
}
