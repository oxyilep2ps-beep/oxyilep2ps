import { BottomNav } from '@/components/dashboard/bottom-nav';

/** Full dashboard chrome for APPROVED users — nav + content padding. Background stays transparent so global leaves show through. */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[calc(100dvh-4rem)]">
      <main className="oxyile-safe-bottom px-3 pt-4 sm:px-6 sm:pt-6">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
