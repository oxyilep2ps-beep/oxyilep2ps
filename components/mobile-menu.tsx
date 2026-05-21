'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { navLinks } from '@/lib/content';

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
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
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-500">OXYILE</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-300">Modern P2P lending</p>
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
            <div className="mt-8 grid gap-3">
              <Link href="/signin" onClick={onClose} className="rounded-full bg-brand-500 px-5 py-3 text-center font-semibold text-white shadow-glow">
                Sign In
              </Link>
              <Link href="/waitlist" onClick={onClose} className="rounded-full border border-white/15 px-5 py-3 text-center font-semibold text-neutral-700 dark:border-white/10 dark:text-neutral-200">
                Join the Waitlist
              </Link>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
