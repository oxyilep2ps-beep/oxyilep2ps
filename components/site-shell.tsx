'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/navbar';

function isAdminRoute(pathname: string) {
  return pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/admin-dashboard');
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hidePublicNavbar = isAdminRoute(pathname);

  return (
    <div className="relative z-10 min-h-screen overflow-x-hidden bg-transparent text-neutral-950 antialiased dark:text-neutral-50">
      {hidePublicNavbar ? null : <Navbar />}
      <main className="bg-transparent">{children}</main>
    </div>
  );
}
