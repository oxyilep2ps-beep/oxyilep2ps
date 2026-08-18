/**
 * Admin dashboard layout — uses AdminLayoutV2 (sidebar + header).
 * To revert the redesign, swap the import back to:
 *   import { AdminShell } from '@/components/admin/admin-shell';
 *   return <AdminShell>{children}</AdminShell>;
 */
import { AdminLayoutV2 } from '@/components/admin/admin-layout-v2';

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutV2>{children}</AdminLayoutV2>;
}
