'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { navLinks } from '@/lib/content';
import { MobileMenu } from '@/components/mobile-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/75 backdrop-blur-xl dark:border-white/10 dark:bg-black">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,#FF814A,#FF5A1F)] text-lg font-black text-white shadow-glow">O</span>
            <div>
              <p className="text-lg font-black tracking-[0.28em] text-neutral-950 dark:text-white">OXYILE</p>
              <p className="text-xs font-medium uppercase tracking-[0.32em] text-neutral-500 dark:text-neutral-300">P2P lending & investment</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => {
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
            <Link href="/signup" className="hidden rounded-full border border-brand-500/40 px-5 py-3 text-sm font-semibold text-brand-600 transition hover:bg-brand-500/10 dark:text-brand-300 sm:inline-flex">
              Sign Up
            </Link>
            <Link href="/signin" className="hidden rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-brand-400 sm:inline-flex">
              Sign In
            </Link>
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
      <MobileMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}
