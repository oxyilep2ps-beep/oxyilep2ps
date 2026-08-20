'use client';

import { useState } from 'react';
import { AdminHeaderV2 } from '@/components/admin/admin-header-v2';
import { AdminSidebarV2 } from '@/components/admin/admin-sidebar-v2';
import { AdminNotificationProvider } from '@/components/admin/admin-notification-provider';
import { BottomNav } from '@/components/dashboard/bottom-nav';
import { UniversalSidebar } from '@/components/shared/universal-sidebar';
import { PortalContextProvider } from '@/components/shared/portal-context';
import { useNavbarAuth } from '@/lib/hooks/use-navbar-auth';

export type PortalId = 'admin' | 'hr' | 'blogger' | 'social' | 'borrower' | 'investor' | 'employee';

const PORTAL_LABELS: Record<PortalId, string> = {
  admin: 'Admin Portal',
  hr: 'HR Portal',
  blogger: 'Blogger Portal',
  social: 'Social Manager Portal',
  borrower: 'Borrower Portal',
  investor: 'Investor Portal',
  employee: 'Employee Portal',
};

export function UniversalDashboardLayout({
  children,
  portal,
  isAdmin = false,
}: {
  children: React.ReactNode;
  portal: PortalId;
  /** Pass true if the current user is an admin so the portal switcher renders */
  isAdmin?: boolean;
}) {
  const { signOut } = useNavbarAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const shell = (
    <div className="relative min-h-screen bg-transparent text-gray-900 dark:text-white">
      {portal === 'admin' ? (
        <AdminSidebarV2
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSignOut={() => void signOut()}
        />
      ) : (
        <UniversalSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSignOut={() => void signOut()}
          portal={portal}
          isAdmin={isAdmin}
        />
      )}
      <div className="lg:pl-64">
        <AdminHeaderV2
          onOpenSidebar={() => setSidebarOpen(true)}
          portalLabel={portal !== 'admin' ? PORTAL_LABELS[portal] : undefined}
          viewingAs={isAdmin && portal !== 'admin' ? PORTAL_LABELS[portal] : undefined}
        />
        <div className="oxyile-safe-bottom min-h-[calc(100dvh-var(--oxyile-header-height))] bg-transparent px-3 pt-4 sm:px-6 sm:pt-6 lg:px-8">
          <PortalContextProvider portal={portal} isAdmin={isAdmin}>
            {children}
          </PortalContextProvider>
        </div>
      </div>
      <BottomNav />
    </div>
  );

  if (portal === 'admin') {
    return <AdminNotificationProvider>{shell}</AdminNotificationProvider>;
  }

  return shell;
}
