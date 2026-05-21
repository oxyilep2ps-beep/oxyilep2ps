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
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/20 bg-white/80 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl dark:border-white/10 dark:bg-black/80"
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
                  'flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-semibold transition',
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
