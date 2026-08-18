'use client';

import Link from 'next/link';
import {
  Briefcase,
  ClipboardList,
  Home,
  Info,
  Mail,
  Menu,
  MessageSquareWarning,
  Newspaper,
  Users,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { navLinks } from '@/lib/content';
import { Logo } from '@/components/logo';
import { MobileMenu } from '@/components/mobile-menu';
import { NavbarAuthActions } from '@/components/navbar-auth-actions';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';
import { ThemeToggle } from '@/components/theme-toggle';
import { useNavbarAuth } from '@/lib/hooks/use-navbar-auth';
import { cn } from '@/lib/utils';

const NAV_ICONS: Record<string, typeof Home> = {
  '/': Home,
  '/admin-dashboard': Home,
  '/about': Info,
  '/blogs': Newspaper,
  '/investors': Users,
  '/waitlist': ClipboardList,
  '/careers': Briefcase,
  '/raise-complaint': MessageSquareWarning,
  '/contact': Mail,
};

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user, dashboardHref, loading, signOut } = useNavbarAuth();
  const isAdminRoute = pathname.startsWith('/admin-dashboard');

  const displayNavLinks = useMemo(
    () =>
      navLinks.map((link) =>
        link.href === '/' && isAdminRoute ? { href: '/admin-dashboard', label: 'Home' } : link
      ),
    [isAdminRoute]
  );

  const logoHref = isAdminRoute ? '/admin-dashboard' : '/';

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-black/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8 lg:py-4">
          <div className="flex items-center gap-3">
            <Logo size="sm" priority href={logoHref} />
            <p className="hidden text-xs font-medium uppercase tracking-[0.32em] text-neutral-500 dark:text-neutral-300 sm:block">
              P2P lending & investment
            </p>
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {displayNavLinks.map((link) => {
              const active = pathname === link.href;
              const Icon = NAV_ICONS[link.href] ?? Home;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors duration-300',
                    active
                      ? 'bg-[#F97316]/10 text-[#F97316]'
                      : 'text-neutral-600 hover:text-[#F97316] dark:text-neutral-300 dark:hover:text-[#F97316]'
                  )}
                >
                  <Icon size={15} strokeWidth={active ? 2.4 : 2} className="shrink-0" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <InstallAppButton />
            <ThemeToggle />
            <NavbarAuthActions
              authenticated={Boolean(user)}
              loading={loading}
              dashboardHref={dashboardHref}
              onSignOut={signOut}
            />
            <button
              onClick={() => setOpen(true)}
              aria-label="Open mobile menu"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white text-neutral-700 dark:border-white/10 dark:bg-black dark:text-neutral-100 lg:hidden"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>
      <MobileMenu
        open={open}
        onClose={() => setOpen(false)}
        authenticated={Boolean(user)}
        authLoading={loading}
        dashboardHref={dashboardHref}
        onSignOut={signOut}
        logoHref={logoHref}
        navLinks={displayNavLinks}
      />
    </>
  );
}
