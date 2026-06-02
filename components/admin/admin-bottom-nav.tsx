'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot,
  Briefcase,
  ClipboardList,
  FileSignature,
  Headphones,
  LayoutDashboard,
  Mail,
  MessageCircle,
  Newspaper,
  Palette,
  ScrollText,
  Settings,
  ShieldAlert,
  User,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const items: {
  href: string;
  label: string;
  icon: typeof Users;
  exact?: boolean;
}[] = [
  { href: '/admin-dashboard/command', label: 'Command', icon: LayoutDashboard, exact: true },
  { href: '/admin-dashboard/applications', label: 'Apps', icon: ClipboardList },
  { href: '/admin-dashboard/waitlist', label: 'Waitlist', icon: Users },
  { href: '/admin-dashboard/contracts', label: 'Contracts', icon: FileSignature },
  { href: '/admin-dashboard/support', label: 'Support', icon: Headphones },
  { href: '/admin-dashboard/blogs', label: 'BlogMgr', icon: Newspaper },
  { href: '/admin-dashboard/oliver', label: 'Oliver', icon: Bot },
  { href: '/admin-dashboard/careers', label: 'Careers', icon: Briefcase },
  { href: '/admin-dashboard/chat', label: 'Chat', icon: MessageCircle },
  { href: '/admin-dashboard/theme', label: 'Theme', icon: Palette },
  { href: '/admin-dashboard/profile', label: 'Profile', icon: User, exact: true },
  { href: '/admin-dashboard/fraud', label: 'Fraud', icon: ShieldAlert },
  { href: '/admin-dashboard/broadcast', label: 'Broadcast', icon: Mail },
  { href: '/admin-dashboard/logs', label: 'Logs', icon: ScrollText },
  { href: '/admin-dashboard/settings', label: 'Settings', icon: Settings },
];

export function AdminBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 overflow-x-auto border-t border-white/20 bg-white/70 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-md dark:border-white/10 dark:bg-white/10"
      aria-label="Admin navigation"
    >
      <ul className="mx-auto flex min-w-max items-center justify-start gap-1 px-1 sm:justify-center">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'flex min-w-[3.25rem] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[9px] font-semibold transition',
                  active ? 'text-brand-500' : 'text-neutral-500 dark:text-neutral-400'
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
