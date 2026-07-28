'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Home, Newspaper, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/blogger', label: 'Overview', icon: Home, exact: true },
  { href: '/blogger/blogs', label: 'Blog Editor', icon: Newspaper },
  { href: '/blogger/seo-guide', label: 'SEO Guide', icon: BookOpen },
  { href: '/blogger/settings', label: 'Settings', icon: Settings },
] as const;

export function BloggerBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 overflow-x-auto border-t border-white/20 bg-white/70 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-md dark:border-white/10 dark:bg-white/10"
      aria-label="Blogger navigation"
    >
      <ul className="mx-auto flex min-w-max items-center justify-center gap-1 px-1">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'flex min-w-[4.25rem] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[9px] font-semibold transition',
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
