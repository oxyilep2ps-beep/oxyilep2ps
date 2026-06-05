'use client';

import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

type NavbarAuthActionsProps = {
  authenticated: boolean;
  loading: boolean;
  dashboardHref: string;
  onSignOut: () => void;
  onNavigate?: () => void;
  layout?: 'desktop' | 'mobile';
};

export function NavbarAuthActions({
  authenticated,
  loading,
  dashboardHref,
  onSignOut,
  onNavigate,
  layout = 'desktop',
}: NavbarAuthActionsProps) {
  if (loading) {
    return (
      <div
        className={cn(
          'animate-pulse rounded-full bg-neutral-200/70 dark:bg-white/10',
          layout === 'desktop' ? 'hidden h-11 w-36 sm:block' : 'mx-auto h-11 w-full max-w-xs'
        )}
        aria-hidden
      />
    );
  }

  if (authenticated) {
    if (layout === 'mobile') {
      return (
        <div className="mt-8 grid gap-3">
          <Link
            href={dashboardHref}
            onClick={onNavigate}
            className="rounded-full bg-brand-500 px-5 py-3 text-center font-semibold text-white shadow-glow"
          >
            Dashboard
          </Link>
          <button
            type="button"
            onClick={() => {
              void onSignOut();
              onNavigate?.();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-5 py-3 font-semibold text-neutral-700 dark:border-white/10 dark:text-neutral-200"
          >
            <LogOut size={16} />
            Log Out
          </button>
        </div>
      );
    }

    return (
      <>
        <Link
          href={dashboardHref}
          className="hidden rounded-full border border-brand-500/40 px-5 py-3 text-sm font-semibold text-brand-600 transition hover:bg-brand-500/10 dark:text-brand-300 sm:inline-flex"
        >
          Dashboard
        </Link>
        <button
          type="button"
          onClick={() => void onSignOut()}
          className="hidden items-center gap-2 rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white sm:inline-flex"
        >
          <LogOut size={16} />
          Log Out
        </button>
      </>
    );
  }

  if (layout === 'mobile') {
    return (
      <div className="mt-8 grid gap-3">
        <Link
          href="/signin"
          onClick={onNavigate}
          className="rounded-full bg-brand-500 px-5 py-3 text-center font-semibold text-white shadow-glow"
        >
          Sign In
        </Link>
        <Link
          href="/waitlist"
          onClick={onNavigate}
          className="rounded-full border border-white/15 px-5 py-3 text-center font-semibold text-neutral-700 dark:border-white/10 dark:text-neutral-200"
        >
          Join the Waitlist
        </Link>
      </div>
    );
  }

  return (
    <>
      <Link
        href="/signup"
        className="hidden rounded-full border border-brand-500/40 px-5 py-3 text-sm font-semibold text-brand-600 transition hover:bg-brand-500/10 dark:text-brand-300 sm:inline-flex"
      >
        Sign Up
      </Link>
      <Link
        href="/signin"
        className="hidden rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-brand-400 sm:inline-flex"
      >
        Sign In
      </Link>
    </>
  );
}
