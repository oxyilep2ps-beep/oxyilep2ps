import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Bot,
  Brain,
  Briefcase,
  ClipboardList,
  FileSignature,
  Handshake,
  Headphones,
  KeyRound,
  LayoutDashboard,
  Mail,
  MessageCircle,
  Newspaper,
  Palette,
  ScrollText,
  Settings,
  Share2,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  Building2,
  Rss,
  Search,
} from 'lucide-react';

export type AdminNavBadgeKey = 'blogs' | 'social' | 'resumes';

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badgeKey?: AdminNavBadgeKey;
};

export type AdminNavGroup = {
  heading: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    heading: 'Social Layer',
    items: [
      { href: '/chat', label: 'Chat Inbox', icon: MessageCircle },
      { href: '/feed', label: 'Global Feed', icon: Rss },
      { href: '/search', label: 'Search Friends', icon: Search },
      { href: '/profile', label: 'Profile', icon: User },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
  {
    heading: 'Menu',
    items: [
      { href: '/admin-dashboard/command', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/admin-dashboard/applications', label: 'Applications', icon: ClipboardList },
      { href: '/admin-dashboard/waitlist', label: 'Waitlist', icon: Users },
      { href: '/admin-dashboard/handshakes', label: 'Handshakes', icon: Handshake },
      { href: '/admin-dashboard/collateral', label: 'Collateral', icon: ShieldCheck },
      { href: '/admin-dashboard/contracts', label: 'Contracts', icon: FileSignature },
      { href: '/admin-dashboard/support', label: 'Support', icon: Headphones },
      { href: '/admin-dashboard/chat', label: 'Chat', icon: MessageCircle },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { href: '/admin-dashboard/blogs', label: 'Blogs', icon: Newspaper, badgeKey: 'blogs' },
      { href: '/admin-dashboard/social-reviews', label: 'Social', icon: Share2, badgeKey: 'social' },
      { href: '/admin-dashboard/careers', label: 'Careers', icon: Briefcase, badgeKey: 'resumes' },
      { href: '/admin-dashboard/hr-overview', label: 'HR Exec', icon: Building2 },
      { href: '/admin-dashboard/employees', label: 'Employees', icon: Users },
      { href: '/admin-dashboard/broadcast', label: 'Newsletter', icon: Mail },
    ],
  },
  {
    heading: 'Intelligence',
    items: [
      { href: '/admin-dashboard/oliver', label: 'Oliver', icon: Bot },
      { href: '/admin-dashboard/ai-training', label: 'AI Data', icon: Brain },
      { href: '/admin/datasets-overview', label: 'Datasets', icon: Activity },
      { href: '/admin-dashboard/fraud', label: 'Fraud', icon: ShieldAlert },
      { href: '/admin-dashboard/logs', label: 'Logs', icon: ScrollText },
      { href: '/admin-dashboard/access', label: 'Access', icon: KeyRound },
    ],
  },
];

export const ADMIN_NAV_FOOTER: AdminNavItem[] = [
  { href: '/admin-dashboard/theme', label: 'Theme', icon: Palette },
  { href: '/profile', label: 'Profile', icon: User, exact: true },
  { href: '/admin-dashboard/settings', label: 'Settings', icon: Settings },
];

export const ADMIN_NAV_FLAT: AdminNavItem[] = [
  ...ADMIN_NAV_GROUPS.flatMap((group) => group.items),
  ...ADMIN_NAV_FOOTER,
];

export function isAdminNavActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href || (href === '/admin-dashboard/command' && pathname === '/admin-dashboard');
  return pathname === href || pathname.startsWith(`${href}/`);
}
