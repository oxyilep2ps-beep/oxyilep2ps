import { BottomNav } from '@/components/dashboard/bottom-nav';
import { OliverBot } from '@/components/oliver/oliver-bot';

/** Full dashboard chrome for APPROVED users — nav + content padding. Background stays transparent so global leaves show through. */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[calc(100dvh-4rem)]">
      <main className="pb-[calc(5.5rem+env(safe-area-inset-bottom))]">{children}</main>
      <OliverBot />
      <BottomNav />
    </div>
  );
}
