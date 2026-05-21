import { AdminBottomNav } from '@/components/admin/admin-bottom-nav';

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[calc(100dvh-4rem)] bg-transparent">
      <div className="mx-auto w-full min-w-0 max-w-7xl px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-6">
        {children}
      </div>
      <AdminBottomNav />
    </div>
  );
}
