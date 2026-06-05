'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { navLinks } from '@/lib/content';
import { Logo } from '@/components/logo';
import { MobileMenu } from '@/components/mobile-menu';
import { NavbarAuthActions } from '@/components/navbar-auth-actions';
import { ThemeToggle } from '@/components/theme-toggle';
import { useNavbarAuth } from '@/lib/hooks/use-navbar-auth';
import { cn } from '@/lib/utils';

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
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/70 backdrop-blur-md dark:border-white/10 dark:bg-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Logo priority href={logoHref} />
            <p className="hidden text-xs font-medium uppercase tracking-[0.32em] text-neutral-500 dark:text-neutral-300 sm:block">
              P2P lending & investment
            </p>
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {displayNavLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition',
                    active
                      ? 'bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-300 dark:hover:bg-white/5 dark:hover:text-white'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
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
