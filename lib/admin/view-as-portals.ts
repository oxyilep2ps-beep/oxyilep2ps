import type { LucideIcon } from 'lucide-react';
import { Building2, Newspaper, Share2, SquareArrowOutUpRight, Star, User } from 'lucide-react';

export type ViewAsPortalId =
  | 'admin'
  | 'hr'
  | 'blogger'
  | 'social'
  | 'borrower'
  | 'investor'
  | 'employee';

export type ViewAsPortalItem = {
  id: ViewAsPortalId;
  label: string;
  href: string;
  icon: LucideIcon;
};

/** All portals an admin can switch into — shared by desktop & mobile sidebar drawers. */
export const ADMIN_VIEW_AS_PORTALS: ViewAsPortalItem[] = [
  { id: 'admin', label: 'Admin Core', href: '/admin-dashboard', icon: SquareArrowOutUpRight },
  { id: 'hr', label: 'HR Portal', href: '/hr', icon: Building2 },
  { id: 'blogger', label: 'Blogger Portal', href: '/blogger', icon: Newspaper },
  { id: 'social', label: 'Social Manager', href: '/social', icon: Share2 },
  { id: 'borrower', label: 'Borrower Portal', href: '/dashboard/borrower', icon: User },
  { id: 'investor', label: 'Investor Portal', href: '/dashboard/investor', icon: Star },
  { id: 'employee', label: 'Employee Portal', href: '/employee/dashboard', icon: Building2 },
];

export function resolveViewAsPortal(pathname: string): ViewAsPortalId {
  if (pathname.startsWith('/hr')) return 'hr';
  if (pathname.startsWith('/blogger')) return 'blogger';
  if (pathname.startsWith('/social')) return 'social';
  if (pathname.startsWith('/employee/dashboard')) return 'employee';
  if (
    pathname.startsWith('/dashboard/investor') ||
    pathname.startsWith('/dashboard/marketplace') ||
    pathname.startsWith('/dashboard/portfolio')
  ) {
    return 'investor';
  }
  if (pathname.startsWith('/dashboard/borrower') || pathname.startsWith('/dashboard/apply')) {
    return 'borrower';
  }
  return 'admin';
}
