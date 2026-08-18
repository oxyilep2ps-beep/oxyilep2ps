/**
 * Legacy /admin routes — same V2 shell as /admin-dashboard.
 * Revert: import { AdminShell } from '@/components/admin/admin-shell';
 */
import { AdminLayoutV2 } from '@/components/admin/admin-layout-v2';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutV2>{children}</AdminLayoutV2>;
}
