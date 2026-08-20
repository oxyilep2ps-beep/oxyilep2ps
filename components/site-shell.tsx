'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/navbar';

/**
 * Paths that start with any of these prefixes are considered internal
 * authenticated routes — the public marketing Navbar is hidden on all of them.
 */
const INTERNAL_PREFIXES = [
  '/admin',
  '/admin-dashboard',
  '/hr',
  '/blogger',
  '/social',
  '/chats',
  '/chat',
  '/feed',
  '/search',
  '/profile',
  '/settings',
  '/dashboard',
  '/employee',
  '/portal',
  '/pending-verification',
  '/user',
  '/payments',
  '/handshake',
  '/guarantor',
  '/suspended',
];

function isInternalRoute(pathname: string) {
  if (!pathname) return false;
  return INTERNAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const hidePublicNavbar = isInternalRoute(pathname);

  return (
    <div className="relative z-10 min-h-screen overflow-x-hidden bg-transparent text-neutral-950 antialiased dark:text-neutral-50">
      {hidePublicNavbar ? null : <Navbar />}
      <main className="bg-transparent">{children}</main>
    </div>
  );
}
