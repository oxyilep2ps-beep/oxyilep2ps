import { AdminBottomNav } from '@/components/admin/admin-bottom-nav';

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-[#fff7f1] dark:bg-black">
      <div className="mx-auto max-w-7xl px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-6">{children}</div>
      <AdminBottomNav />
    </div>
  );
}
