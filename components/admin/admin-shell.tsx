import { AdminBottomNav } from '@/components/admin/admin-bottom-nav';
import { AdminWebhookTerminal } from '@/components/admin/admin-webhook-terminal';
import { Logo } from '@/components/logo';

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[calc(100dvh-4rem)] bg-transparent">
      <header className="sticky top-16 z-30 border-b border-white/60 bg-white/70 backdrop-blur-md dark:border-white/10 dark:bg-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo size="sm" priority />
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-500">Admin Portal</p>
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
