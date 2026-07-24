import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export type EmployeeRole = 'admin' | 'hr' | 'blogger';

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
  if (role === 'admin' || role === 'hr' || role === 'blogger') return role;
  return null;
}

export async function assertEmailAllowedForEmployeeSignup(email: string): Promise<EmployeeRole> {
  const role = await getAllowedEmployeeRole(email);
  if (!role) {
    throw new Error('Unauthorized: Your email is not added in the employee directory.');
  }
  return role;
}

export function employeeRoleToProfileRole(role: EmployeeRole): 'ADMIN' | 'HR' | 'BLOGGER' {
  switch (role) {
    case 'admin':
      return 'ADMIN';
    case 'hr':
      return 'HR';
    case 'blogger':
      return 'BLOGGER';
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
    default:
      return null;
  }
}
