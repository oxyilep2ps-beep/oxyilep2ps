import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { AdminBottomNav } from '@/components/admin/admin-bottom-nav';
import { AdminWebhookTerminal } from '@/components/admin/admin-webhook-terminal';
import { Logo } from '@/components/logo';

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[calc(100dvh-4rem)] bg-transparent">
      <header className="sticky top-16 z-30 border-b border-white/60 bg-white/70 backdrop-blur-md dark:border-white/10 dark:bg-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Logo size="sm" priority href="/admin-dashboard" />
            <p className="hidden text-xs font-semibold uppercase tracking-[0.28em] text-brand-500 sm:block">
              Admin Portal
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin-dashboard"
              className="rounded-full border border-brand-500/30 px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-500/10 dark:text-brand-300"
            >
              Dashboard
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/40 px-3 py-1.5 text-xs font-semibold text-neutral-600 transition hover:bg-white/60 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5"
            >
              View Public Site
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full min-w-0 max-w-7xl px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-6">
        {children}
      </div>
      <AdminWebhookTerminal />
      <AdminBottomNav />
    </div>
  );
}
