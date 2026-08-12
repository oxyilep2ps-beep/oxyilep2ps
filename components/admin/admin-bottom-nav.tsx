'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot,
  Briefcase,
  ClipboardList,
  FileSignature,
  Handshake,
  Headphones,
  Home,
  LayoutDashboard,
  Mail,
  MessageCircle,
  Newspaper,
  Palette,
  ScrollText,
  Settings,
  KeyRound,
  Share2,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  Building2,
} from 'lucide-react';
import { useAdminNotificationContext } from '@/components/admin/admin-notification-provider';
import { cn } from '@/lib/utils';

const items: {
  href: string;
  label: string;
  icon: typeof Users;
  exact?: boolean;
  badgeKey?: 'blogs' | 'social' | 'resumes';
}[] = [
  { href: '/admin-dashboard', label: 'Home', icon: Home, exact: true },
  { href: '/admin-dashboard/command', label: 'Command', icon: LayoutDashboard, exact: true },
  { href: '/admin-dashboard/applications', label: 'Apps', icon: ClipboardList },
  { href: '/admin-dashboard/waitlist', label: 'Waitlist', icon: Users },
  { href: '/admin-dashboard/handshakes', label: 'Handshakes', icon: Handshake },
  { href: '/admin-dashboard/collateral', label: 'Collateral', icon: ShieldCheck },
  { href: '/admin-dashboard/contracts', label: 'Contracts', icon: FileSignature },
  { href: '/admin-dashboard/support', label: 'Support', icon: Headphones },
  { href: '/admin-dashboard/blogs', label: 'BlogMgr', icon: Newspaper, badgeKey: 'blogs' },
  {
    href: '/admin-dashboard/social-reviews',
    label: 'Social',
    icon: Share2,
    badgeKey: 'social',
  },
  { href: '/admin-dashboard/oliver', label: 'Oliver', icon: Bot },
  { href: '/admin-dashboard/careers', label: 'Careers', icon: Briefcase, badgeKey: 'resumes' },
  { href: '/admin-dashboard/hr-overview', label: 'HR Exec', icon: Building2 },
  { href: '/admin-dashboard/employees', label: 'Employees', icon: Users },
  { href: '/admin-dashboard/chat', label: 'Chat', icon: MessageCircle },
  { href: '/admin-dashboard/theme', label: 'Theme', icon: Palette },
  { href: '/admin-dashboard/profile', label: 'Profile', icon: User, exact: true },
  { href: '/admin-dashboard/fraud', label: 'Fraud', icon: ShieldAlert },
  { href: '/admin-dashboard/access', label: 'Access', icon: KeyRound },
  { href: '/admin-dashboard/broadcast', label: 'Newsletter', icon: Mail },
  { href: '/admin-dashboard/logs', label: 'Logs', icon: ScrollText },
  { href: '/admin-dashboard/settings', label: 'Settings', icon: Settings },
];

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function AdminBottomNav() {
  const pathname = usePathname();
  const { counts } = useAdminNotificationContext();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 overflow-x-auto border-t border-neutral-800/80 bg-white/70 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-md dark:border-neutral-800/80 dark:bg-[#080808]/95"
      aria-label="Admin navigation"
    >
      <ul className="mx-auto flex min-w-max items-center justify-start gap-1 px-1 sm:justify-center">
        {items.map(({ href, label, icon: Icon, exact, badgeKey }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          const badge = badgeKey ? counts[badgeKey] : 0;
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'relative flex min-w-[3.25rem] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[9px] font-semibold transition hover:bg-neutral-800/60',
                  active ? 'text-orange-500' : 'text-neutral-500 dark:text-neutral-400'
                )}
              >
                <span className="relative inline-flex">
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                  <NavBadge count={badge} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
