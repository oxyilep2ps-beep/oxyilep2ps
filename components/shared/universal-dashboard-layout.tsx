'use client';

import { useState } from 'react';
import { AdminHeaderV2 } from '@/components/admin/admin-header-v2';
import { UniversalSidebar } from '@/components/shared/universal-sidebar';
import { useNavbarAuth } from '@/lib/hooks/use-navbar-auth';

export type PortalId = 'admin' | 'hr' | 'blogger' | 'social';

const PORTAL_LABELS: Record<PortalId, string> = {
  admin: 'Admin Portal',
  hr: 'HR Portal',
  blogger: 'Blogger Portal',
  social: 'Social Manager Portal',
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

  return (
    <div className="relative min-h-screen bg-transparent text-gray-900 dark:text-white">
      <UniversalSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSignOut={() => void signOut()}
        portal={portal}
        isAdmin={isAdmin}
      />
      <div className="lg:pl-64">
        <AdminHeaderV2
          onOpenSidebar={() => setSidebarOpen(true)}
          portalLabel={portal !== 'admin' ? PORTAL_LABELS[portal] : undefined}
        />
        <div className="min-h-[calc(100dvh-3.5rem)] bg-transparent px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}
