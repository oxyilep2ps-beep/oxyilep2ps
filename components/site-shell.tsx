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
  '/dashboard',
  '/employee/dashboard',
  '/portal',
  '/pending-verification',
  '/user/',
  '/payments',
];

function isInternalRoute(pathname: string) {
  return INTERNAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hidePublicNavbar = isInternalRoute(pathname);

  return (
    <div className="relative z-10 min-h-screen overflow-x-hidden bg-transparent text-neutral-950 antialiased dark:text-neutral-50">
      {hidePublicNavbar ? null : <Navbar />}
      <main className="bg-transparent">{children}</main>
    </div>
  );
}
