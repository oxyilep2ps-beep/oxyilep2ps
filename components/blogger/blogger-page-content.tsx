'use client';

import { usePortalContext } from '@/components/shared/portal-context';
import { BloggerCmsDashboard } from '@/components/blogger/blogger-cms-dashboard';
import { AdminPendingBlogsQueue } from '@/components/admin/admin-pending-blogs-queue';
import { ClipboardList } from 'lucide-react';

export function BloggerPageContent() {
  const { isAdmin } = usePortalContext();

  return (
    <div className="space-y-10">
      {/* Standard CMS — always visible */}
      <BloggerCmsDashboard />

      {/* Admin-only: pending approval queue */}
      {isAdmin && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList size={18} className="text-[#F97316]" />
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                Pending Approvals
              </h2>
              <p className="text-xs text-gray-500">
                Blog posts submitted by team bloggers waiting for your review.
              </p>
            </div>
            <span className="ml-2 rounded-full bg-[#F97316]/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#F97316]">
              Admin Only
            </span>
          </div>
          <AdminPendingBlogsQueue />
        </section>
      )}
    </div>
  );
}
