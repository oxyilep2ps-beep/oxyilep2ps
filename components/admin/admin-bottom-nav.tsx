'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Briefcase, FileSignature, MessageCircle, Settings, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const items: {
  href: string;
  label: string;
  icon: typeof Users;
  exact?: boolean;
}[] = [
  { href: '/admin-dashboard', label: 'Users', icon: Users, exact: true },
  { href: '/admin-dashboard/contracts', label: 'Contracts', icon: FileSignature },
  { href: '/admin-dashboard/careers', label: 'Careers', icon: Briefcase },
  { href: '/admin-dashboard/chat', label: 'Chat', icon: MessageCircle },
  { href: '/admin-dashboard/settings', label: 'Settings', icon: Settings },
];

export function AdminBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 overflow-x-auto border-t border-white/20 bg-white/70 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-md dark:border-white/10 dark:bg-white/10"
      aria-label="Admin navigation"
    >
      <ul className="mx-auto flex max-w-lg items-center justify-between">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'flex min-w-[3rem] flex-col items-center gap-0.5 rounded-xl px-1.5 py-1.5 text-[9px] font-semibold transition sm:min-w-0 sm:px-2 sm:text-[10px]',
                  active ? 'text-brand-500' : 'text-neutral-500 dark:text-neutral-400'
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
