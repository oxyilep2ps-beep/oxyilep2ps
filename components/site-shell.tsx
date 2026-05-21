'use client';

import { Navbar } from '@/components/navbar';

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 min-h-screen overflow-x-hidden text-neutral-950 antialiased dark:text-neutral-50">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}
