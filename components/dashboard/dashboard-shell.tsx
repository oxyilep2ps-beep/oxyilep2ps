import { BottomNav } from '@/components/dashboard/bottom-nav';

/** Full dashboard chrome for APPROVED users — nav + content padding. Background stays transparent so global leaves show through. */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[calc(100dvh-4rem)]">
      <main className="px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6 sm:pb-[calc(7rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
