'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Building2,
  ChevronRight,
  Loader2,
  MessageCircle,
  Newspaper,
  PenSquare,
  Pin,
  Rss,
  Share2,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { listGlobalAnnouncements, type GlobalAnnouncement } from '@/app/actions/global-announcements';
import { listDiscoverUsers, sendConnectionRequest, type DiscoverUser } from '@/app/actions/connections';
import { cn } from '@/lib/utils';

// ─── Portal config ───────────────────────────────────────────────────────────

type PortalConfig = {
  href: string;
  label: string;
  icon: React.ElementType;
  description: string;
};

const PORTAL_MAP: Record<string, PortalConfig> = {
  ADMIN: {
    href: '/admin-dashboard',
    label: 'Admin Portal',
    icon: Sparkles,
    description: 'Manage users, posts, analytics & more.',
  },
  HR: {
    href: '/hr',
    label: 'HR Studio',
    icon: Building2,
    description: 'Recruitment, payroll, and team oversight.',
  },
  BLOGGER: {
    href: '/blogger',
    label: 'Editorial Hub',
    icon: Newspaper,
    description: 'Write, draft, and publish platform content.',
  },
  SOCIAL_MANAGER: {
    href: '/social',
    label: 'Social Hub',
    icon: Share2,
    description: 'Schedule posts and track social performance.',
  },
  INVESTOR: {
    href: '/dashboard/marketplace',
    label: 'Investor Hub',
    icon: Rss,
    description: 'Browse and fund collateral-backed loans.',
  },
  BORROWER: {
    href: '/dashboard/apply',
    label: 'Borrower Hub',
    icon: PenSquare,
    description: 'Submit and track your loan applications.',
  },
  EMPLOYEE: {
    href: '/employee/dashboard',
    label: 'Employee Portal',
    icon: Users,
    description: 'Your tasks, payslips, and leave requests.',
  },
};

// ─── Announcement card ────────────────────────────────────────────────────────

function AnnouncementCard({ item }: { item: GlobalAnnouncement }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-white/10 dark:bg-[#111]"
    >
      {item.pinned && (
        <div className="flex items-center gap-1 bg-[#F97316]/10 px-4 py-1.5 text-xs font-semibold text-[#F97316]">
          <Pin size={12} className="shrink-0" />
          Pinned Announcement
        </div>
      )}
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none">{item.emoji}</span>
          <div className="min-w-0">
            <h3 className="font-bold text-neutral-900 dark:text-white">{item.title}</h3>
            {item.body && (
              <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{item.body}</p>
            )}
            <p className="mt-2 text-[11px] text-neutral-400">
              {new Date(item.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

// ─── Suggested user card ──────────────────────────────────────────────────────

function SuggestedUserRow({ user }: { user: DiscoverUser }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent'>('idle');

  async function handleConnect() {
    setStatus('loading');
    await sendConnectionRequest(user.id);
    setStatus('sent');
  }

  const displayName = user.full_legal_name ?? user.username ?? '?';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-neutral-100 dark:hover:bg-white/5">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#F97316]/60 to-[#F97316]/20 text-sm font-bold text-white">
        {user.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar_url} alt={displayName} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          initials
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
          {displayName}
        </p>
        <p className="text-[11px] capitalize text-neutral-400">{(user.role ?? '').toLowerCase()}</p>
      </div>

      <button
        type="button"
        disabled={status !== 'idle'}
        onClick={handleConnect}
        className={cn(
          'flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition',
          status === 'sent'
            ? 'bg-green-500/10 text-green-500'
            : 'bg-[#F97316]/10 text-[#F97316] hover:bg-[#F97316]/20 disabled:opacity-60'
        )}
      >
        {status === 'loading' ? (
          <Loader2 size={12} className="animate-spin" />
        ) : status === 'sent' ? (
          <>
            <UserCheck size={12} />
            Sent
          </>
        ) : (
          <>
            <UserPlus size={12} />
            Connect
          </>
        )}
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SocialFeed() {
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<GlobalAnnouncement[]>([]);
  const [suggestions, setSuggestions] = useState<DiscoverUser[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    let mounted = true;

    async function load() {
      const [annoRes, suggestRes] = await Promise.all([
        listGlobalAnnouncements(10),
        listDiscoverUsers(8),
      ]);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && mounted) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, full_legal_name')
          .eq('id', user.id)
          .maybeSingle();
        setRole(profile?.role ?? null);
        setDisplayName(
          (profile as { full_legal_name?: string } | null)?.full_legal_name ??
          user.email?.split('@')[0] ??
          'there'
        );
      }

      if (mounted) {
        setAnnouncements(annoRes);
        setSuggestions(suggestRes);
        setLoading(false);
      }
    }

    void load();
    return () => { mounted = false; };
  }, []);

  const portalConfig = role ? PORTAL_MAP[role] ?? null : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      {/* ── Page header ── */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white">
            Hey{displayName ? `, ${displayName}` : ''} 👋
          </h1>
          <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
            Here&apos;s what&apos;s happening on the platform today.
          </p>
        </div>

        {/* FAB — Chat Inbox */}
        <Link
          href="/chats"
          className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F97316] text-white shadow-lg transition hover:bg-[#F97316]/90 active:scale-95"
          aria-label="Open chat inbox"
        >
          <MessageCircle size={22} strokeWidth={2.2} />
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* ────────────── LEFT: Feed ────────────── */}
        <div className="space-y-4">
          {/* Go to My Portal card */}
          {portalConfig && (
            <Link
              href={portalConfig.href}
              className="flex items-center gap-4 rounded-2xl border border-[#F97316]/30 bg-[#F97316]/5 p-4 transition hover:border-[#F97316]/60 hover:bg-[#F97316]/10"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#F97316]/10 text-[#F97316]">
                <portalConfig.icon size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-neutral-900 dark:text-white">Go to My Portal</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{portalConfig.description}</p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-[#F97316]" />
            </Link>
          )}

          {/* Announcements section */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
              <Bell size={13} />
              Platform Announcements
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={22} className="animate-spin text-[#F97316]" />
              </div>
            ) : announcements.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-200 py-12 text-center dark:border-white/10">
                <Bell size={28} className="mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
                <p className="text-sm text-neutral-400">No announcements yet.</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                <div className="space-y-3">
                  {announcements.map((item) => (
                    <AnnouncementCard key={item.id} item={item} />
                  ))}
                </div>
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* ────────────── RIGHT: Suggested connections ────────────── */}
        <aside className="space-y-3">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-[#111]">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
              <Users size={13} />
              Suggested Connections
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={18} className="animate-spin text-[#F97316]" />
              </div>
            ) : suggestions.length === 0 ? (
              <p className="py-4 text-center text-xs text-neutral-400">You&apos;re all caught up!</p>
            ) : (
              <div className="space-y-1">
                {suggestions.map((u) => (
                  <SuggestedUserRow key={u.id} user={u} />
                ))}
              </div>
            )}

            <Link
              href="/chats"
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#F97316]/30 py-2.5 text-xs font-semibold text-[#F97316] transition hover:bg-[#F97316]/5"
            >
              <MessageCircle size={13} />
              Open Chat Inbox
            </Link>
          </div>

          {/* Quick links */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-[#111]">
            <h2 className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-neutral-400">Quick Links</h2>
            <ul className="space-y-1">
              <li>
                <Link href="/dashboard/profile" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-white/5">
                  Your Profile
                </Link>
              </li>
              <li>
                <Link href="/dashboard/settings" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-white/5">
                  Settings
                </Link>
              </li>
              <li>
                <Link href="/" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-white/5">
                  View Public Site
                </Link>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
