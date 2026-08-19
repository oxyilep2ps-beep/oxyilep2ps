 'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  ChevronRight,
  Edit3,
  Loader2,
  MessageCircle,
  Newspaper,
  PenSquare,
  Rss,
  Send,
  Share2,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  createGlobalPost,
  deleteGlobalPost,
  listGlobalPosts,
  type FeedPost,
  updateGlobalPost,
} from '@/app/actions/social-network';
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
    href: '/admin-dashboard/command',
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

function FeedPostCard({
  item,
  canManage,
  onDelete,
  onEdit,
}: {
  item: FeedPost;
  canManage: boolean;
  onDelete: (id: string) => void;
  onEdit: (id: string, content: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [nextText, setNextText] = useState(item.content);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-neutral-800 bg-[#111]"
    >
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#F97316]/20 text-[11px] font-black text-[#F97316]">
            {item.author_name.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{item.author_name}</p>
            <p className="text-[10px] uppercase tracking-wide text-neutral-400">{item.author_role}</p>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-[#F97316]/10 hover:text-[#F97316]"
            >
              <Edit3 size={14} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2 p-4">
        {editing ? (
          <>
            <textarea
              value={nextText}
              onChange={(e) => setNextText(e.target.value)}
              className="min-h-24 w-full rounded-xl border border-neutral-700 bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none focus:border-[#F97316]/60"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-full border border-neutral-700 px-3 py-1 text-xs font-semibold text-neutral-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onEdit(item.id, nextText);
                  setEditing(false);
                }}
                className="rounded-full bg-[#F97316] px-3 py-1 text-xs font-semibold text-white"
              >
                Save
              </button>
            </div>
          </>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-200">{item.content}</p>
        )}
        <p className="text-[10px] text-neutral-500">
          {new Date(item.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
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
  const [postsLoading, setPostsLoading] = useState(true);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [suggestions, setSuggestions] = useState<DiscoverUser[]>([]);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [myId, setMyId] = useState<string>('');
  const [displayName, setDisplayName] = useState('');
  const [postText, setPostText] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let mounted = true;

    async function load() {
      setPostsLoading(true);
      setSuggestionsLoading(true);
      setPostsError(null);
      setSuggestionsError(null);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user && mounted) {
          setMyId(user.id);
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

        try {
          const postRes = await listGlobalPosts(40);
          if (mounted) setPosts(postRes);
        } catch (err) {
          if (mounted) setPostsError(err instanceof Error ? err.message : 'Failed to load posts.');
        } finally {
          if (mounted) setPostsLoading(false);
        }

        try {
          const suggestRes = await listDiscoverUsers(12);
          if (mounted) setSuggestions(suggestRes);
        } catch (err) {
          if (mounted) setSuggestionsError(err instanceof Error ? err.message : 'Failed to load suggestions.');
        } finally {
          if (mounted) setSuggestionsLoading(false);
        }
      } catch {
        if (mounted) {
          setPostsLoading(false);
          setSuggestionsLoading(false);
          setPostsError('Failed to initialize feed session.');
          setSuggestionsError('Failed to initialize suggestions.');
        }
      }
    }

    void load();
    return () => { mounted = false; };
  }, []);

  const portalConfig = role ? PORTAL_MAP[role] ?? null : null;
  const canCreatePost = role ? ['ADMIN', 'HR', 'BLOGGER', 'SOCIAL_MANAGER'].includes(role) : false;
  const canManageAnyPost = role === 'ADMIN';

  const visibleSuggestions = useMemo(
    () => suggestions.filter((u) => u.connection_status !== 'accepted').slice(0, 10),
    [suggestions]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {/* ── Page header ── */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">
            Hey{displayName ? `, ${displayName}` : ''} 👋
          </h1>
          <p className="mt-0.5 text-sm text-neutral-400">
            Here&apos;s what&apos;s happening on the platform today.
          </p>
        </div>

        {/* FAB — Chat Inbox */}
        <Link
          href="/chat"
          className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F97316] text-white shadow-lg transition hover:bg-[#F97316]/90 active:scale-95"
          aria-label="Open chat inbox"
        >
          <MessageCircle size={22} strokeWidth={2.2} />
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
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
                <p className="font-bold text-white">Go to My Portal</p>
                <p className="text-sm text-neutral-400">{portalConfig.description}</p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-[#F97316]" />
            </Link>
          )}

          {/* Create post composer */}
          {canCreatePost && (
            <div className="rounded-2xl border border-neutral-800 bg-[#111] p-4">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-neutral-400">Create Post</p>
              <textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="Share an update with everyone..."
                className="min-h-24 w-full rounded-xl border border-neutral-700 bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-[#F97316]/60"
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  disabled={!postText.trim() || isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await createGlobalPost({ content: postText });
                      if (!res.ok) return;
                      setPostText('');
                      setPosts(await listGlobalPosts(40));
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#F97316] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  {isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  Post
                </button>
              </div>
            </div>
          )}

          {/* Feed section */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
              <Sparkles size={13} />
              Global Feed
            </h2>

            {postsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={22} className="animate-spin text-[#F97316]" />
              </div>
            ) : postsError ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
                <p className="text-sm font-semibold text-red-300">Could not load posts</p>
                <p className="mt-1 text-xs text-red-200/80">{postsError}</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-800 py-12 text-center">
                <Sparkles size={28} className="mx-auto mb-3 text-neutral-600" />
                <p className="text-sm text-neutral-400">No posts yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((item) => (
                  <FeedPostCard
                    key={item.id}
                    item={item}
                    canManage={!item.id.startsWith('legacy-') && (canManageAnyPost || item.author_id === myId)}
                    onDelete={(id) =>
                      startTransition(async () => {
                        await deleteGlobalPost(id);
                        setPosts(await listGlobalPosts(40));
                      })
                    }
                    onEdit={(id, content) =>
                      startTransition(async () => {
                        await updateGlobalPost({ id, content });
                        setPosts(await listGlobalPosts(40));
                      })
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ────────────── RIGHT: Suggested connections ────────────── */}
        <aside className="space-y-3">
          <div className="rounded-2xl border border-neutral-800 bg-[#111] p-4">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
              <Users size={13} />
              Suggested Connections
            </h2>

            {suggestionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={18} className="animate-spin text-[#F97316]" />
              </div>
            ) : suggestionsError ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="text-xs font-semibold text-amber-200">Could not load suggestions</p>
                <p className="mt-1 text-[11px] text-amber-100/80">{suggestionsError}</p>
              </div>
            ) : visibleSuggestions.length === 0 ? (
              <p className="py-4 text-center text-xs text-neutral-400">No suggestions found right now.</p>
            ) : (
              <div className="space-y-1">
                {visibleSuggestions.map((u) => (
                  <SuggestedUserRow key={u.id} user={u} />
                ))}
              </div>
            )}

            <Link
              href="/chat"
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#F97316]/30 py-2.5 text-xs font-semibold text-[#F97316] transition hover:bg-[#F97316]/5"
            >
              <MessageCircle size={13} />
              Open Chat Inbox
            </Link>
          </div>

          {/* Quick links */}
          <div className="rounded-2xl border border-neutral-800 bg-[#111] p-4">
            <h2 className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-neutral-400">Quick Links</h2>
            <ul className="space-y-1">
              <li>
                <Link href="/profile/edit" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-300 transition hover:bg-white/5">
                  Your Profile
                </Link>
              </li>
              <li>
                <Link href="/profile/edit" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-300 transition hover:bg-white/5">
                  Settings
                </Link>
              </li>
              <li>
                <Link href="/" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-300 transition hover:bg-white/5">
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
