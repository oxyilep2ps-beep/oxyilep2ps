import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireApprovedUser } from '@/lib/auth/require-approved';
import { PremiumChatShell } from '@/components/chat/premium-chat-shell';

export const metadata = { title: 'Chat Inbox | Oxyile' };

function getPortalHref(role: string): string {
  if (role === 'ADMIN') return '/admin';
  if (role === 'HR') return '/hr';
  if (role === 'BLOGGER') return '/blogger';
  if (role === 'SOCIAL_MANAGER') return '/social';
  if (role === 'EMPLOYEE') return '/employee/dashboard';
  return '/dashboard';
}

export default async function ChatPage() {
  const { profile } = await requireApprovedUser();
  const portalHref = getPortalHref(profile.role);

  return (
    <section className="mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
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
      <PremiumChatShell />
    </section>
  );
}
