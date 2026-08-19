'use client';

import { usePortalContext } from '@/components/shared/portal-context';
import { SocialOverviewClient } from '@/components/social/social-overview-client';
import { AdminPendingSocialQueue } from '@/components/admin/admin-pending-social-queue';
import { ClipboardList } from 'lucide-react';

export function SocialPageContent() {
  const { isAdmin } = usePortalContext();

  return (
    <div className="space-y-10">
      {/* Standard overview — always visible */}
      <SocialOverviewClient />

      {/* Admin-only: pending approval queue */}
      {isAdmin && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList size={18} className="text-[#F97316]" />
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                Pending Campaign Approvals
              </h2>
              <p className="text-xs text-gray-500">
                Social campaigns submitted by your team waiting for review.
              </p>
            </div>
            <span className="ml-2 rounded-full bg-[#F97316]/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#F97316]">
              Admin Only
            </span>
          </div>
          <AdminPendingSocialQueue />
        </section>
      )}
    </div>
  );
}
