import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export type EmployeeRole = 'admin' | 'hr' | 'blogger' | 'social_manager' | 'employee';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getAllowedEmployeeRole(email: string): Promise<EmployeeRole | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('allowed_employees')
    .select('role')
    .eq('email', normalizeEmail(email))
    .maybeSingle();

  if (error || !data?.role) return null;
  const role = String(data.role).toLowerCase();
  if (
    role === 'admin' ||
    role === 'hr' ||
    role === 'blogger' ||
    role === 'social_manager' ||
    role === 'employee'
  ) {
    return role;
  }
  return null;
}

export async function assertEmailAllowedForEmployeeSignup(email: string): Promise<EmployeeRole> {
  const role = await getAllowedEmployeeRole(email);
  if (!role) {
    throw new Error('Unauthorized: Your email is not added in the employee directory.');
  }
  return role;
}

export function employeeRoleToProfileRole(
  role: EmployeeRole
): 'ADMIN' | 'HR' | 'BLOGGER' | 'SOCIAL_MANAGER' | 'EMPLOYEE' {
  switch (role) {
    case 'admin':
      return 'ADMIN';
    case 'hr':
      return 'HR';
    case 'blogger':
      return 'BLOGGER';
    case 'social_manager':
      return 'SOCIAL_MANAGER';
    case 'employee':
      return 'EMPLOYEE';
  }
}

export function profileRoleToEmployeeRole(role: string): EmployeeRole | null {
  switch (role.toUpperCase()) {
    case 'ADMIN':
      return 'admin';
    case 'HR':
      return 'hr';
    case 'BLOGGER':
      return 'blogger';
    case 'SOCIAL_MANAGER':
      return 'social_manager';
    case 'EMPLOYEE':
      return 'employee';
    default:
      return null;
  }
}
