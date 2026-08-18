'use client';

import Link from 'next/link';
import { ExternalLink, LogOut } from 'lucide-react';
import { AdminBottomNav } from '@/components/admin/admin-bottom-nav';
import {
  AdminNotificationBell,
  AdminNotificationProvider,
} from '@/components/admin/admin-notification-provider';
import { AdminWebhookTerminal } from '@/components/admin/admin-webhook-terminal';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { useNavbarAuth } from '@/lib/hooks/use-navbar-auth';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { signOut } = useNavbarAuth();

  return (
    <AdminNotificationProvider>
      <div className="relative min-h-screen bg-transparent">
        <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-black/80">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-4">
              <Logo size="sm" priority href="/admin-dashboard" />
              <p className="hidden text-xs font-semibold uppercase tracking-[0.28em] text-[#F97316] sm:block">
                Admin Portal
              </p>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
              <AdminNotificationBell />
              <ThemeToggle className="h-9 w-9" />
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:border-[#F97316]/40 hover:text-[#F97316] dark:border-neutral-800 dark:text-neutral-300"
              >
                View Public Site
                <ExternalLink size={12} />
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white"
              >
                <LogOut size={14} />
                Log Out
              </button>
            </div>
          </div>
        </header>
        <div className="mx-auto w-full min-w-0 max-w-7xl px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-6">
          {children}
        </div>
        <AdminWebhookTerminal />
        <AdminBottomNav />
      </div>
    </AdminNotificationProvider>
  );
}
