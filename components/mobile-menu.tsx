'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Logo } from '@/components/logo';
import { NavbarAuthActions } from '@/components/navbar-auth-actions';

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  authenticated: boolean;
  authLoading: boolean;
  dashboardHref: string;
  onSignOut: () => void;
  logoHref?: string;
  navLinks: { href: string; label: string }[];
};

export function MobileMenu({
  open,
  onClose,
  authenticated,
  authLoading,
  dashboardHref,
  onSignOut,
  logoHref = '/',
  navLinks,
}: MobileMenuProps) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-label="Close menu overlay"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 250, damping: 28 }}
            className="fixed right-0 top-0 z-50 h-full w-[84vw] max-w-sm border-l border-white/10 bg-white/90 p-6 shadow-2xl backdrop-blur-xl dark:bg-black md:hidden"
          >
            <div className="mb-8 flex items-center justify-between">
              <div>
                <Logo size="sm" href={logoHref} />
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-300">Modern P2P lending</p>
              </div>
              <button onClick={onClose} className="rounded-full border border-white/15 p-2 text-neutral-700 dark:border-white/10 dark:text-neutral-200">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  className="block rounded-2xl border border-transparent px-4 py-3 text-lg font-medium text-neutral-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 dark:text-neutral-200 dark:hover:border-brand-500/20 dark:hover:bg-brand-500/10"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <NavbarAuthActions
              authenticated={authenticated}
              loading={authLoading}
              dashboardHref={dashboardHref}
              onSignOut={onSignOut}
              onNavigate={onClose}
              layout="mobile"
            />
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
