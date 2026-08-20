import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireApprovedUser } from '@/lib/auth/require-approved';
import { PremiumChatShell } from '@/components/chat/premium-chat-shell';

export const metadata = { title: 'Chat Inbox | Oxyile' };

function getPortalHref(role: string): string {
  if (role === 'ADMIN') return '/admin-dashboard/command';
  if (role === 'HR') return '/hr';
  if (role === 'BLOGGER') return '/blogger';
  if (role === 'SOCIAL_MANAGER') return '/social';
  if (role === 'EMPLOYEE') return '/employee/dashboard';
  if (role === 'BORROWER') return '/dashboard/borrower';
  if (role === 'INVESTOR') return '/dashboard/investor';
  return '/dashboard';
}

export default async function ChatPage() {
  const { profile } = await requireApprovedUser();
  const portalHref = getPortalHref(profile.role);

  return (
    <section className="oxyile-fill-chrome mx-auto -mb-[var(--oxyile-safe-bottom-padding)] flex w-full max-w-[1500px] flex-col gap-3 px-3 pt-2 sm:px-4">
      <div className="hidden shrink-0 flex-wrap items-center gap-2 md:flex">
        <Link
          href="/feed"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#F97316]/40 bg-[#F97316]/10 px-3 py-1.5 text-xs font-bold text-[#F97316]"
        >
          <ChevronLeft size={14} />
          Back to Feed
        </Link>
        <Link
          href={portalHref}
          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-700 px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:border-[#F97316]/40 hover:text-[#F97316]"
        >
          Back to Portal
        </Link>
      </div>
      <div className="min-h-0 flex-1">
        <PremiumChatShell />
      </div>
    </section>
  );
}
