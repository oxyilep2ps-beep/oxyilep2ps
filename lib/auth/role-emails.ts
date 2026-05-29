export const HR_STAFF_EMAIL = 'careers.oxyile@gmail.com';
export const BLOGGER_STAFF_EMAIL = 'blogger.oxyile@gmail.com';

export function isHrStaffEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === HR_STAFF_EMAIL;
}

export function isBloggerStaffEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === BLOGGER_STAFF_EMAIL;
}

export type StaffRole = 'HR' | 'BLOGGER';

export function staffRoleForEmail(email: string | undefined | null): StaffRole | null {
  if (isHrStaffEmail(email)) return 'HR';
  if (isBloggerStaffEmail(email)) return 'BLOGGER';
  return null;
}
