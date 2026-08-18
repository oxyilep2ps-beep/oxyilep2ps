'use client';

import { useState } from 'react';
import { AdminHeaderV2 } from '@/components/admin/admin-header-v2';
import { AdminSidebarV2 } from '@/components/admin/admin-sidebar-v2';
import {
  AdminNotificationProvider,
} from '@/components/admin/admin-notification-provider';
import { AdminWebhookTerminal } from '@/components/admin/admin-webhook-terminal';
import { useNavbarAuth } from '@/lib/hooks/use-navbar-auth';

/**
 * AdminLayoutV2 — sidebar + top header shell.
 * Revert by swapping this import back to `@/components/admin/admin-shell`.
 *
 * Root wrappers stay transparent so GlobalThemeBackground (root layout, -z-10)
 * shows through. Do not add a `dark` class here — theme comes from <html>.
 */
export function AdminLayoutV2({ children }: { children: React.ReactNode }) {
  const { signOut } = useNavbarAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AdminNotificationProvider>
      <div className="admin-layout-v2 relative min-h-screen bg-transparent text-gray-900 dark:text-white">
        <AdminSidebarV2
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSignOut={() => void signOut()}
        />
        <div className="lg:pl-64">
          <AdminHeaderV2 onOpenSidebar={() => setSidebarOpen(true)} />
          <div className="min-h-[calc(100dvh-4rem)] bg-transparent px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
        <AdminWebhookTerminal />
      </div>
    </AdminNotificationProvider>
  );
}
