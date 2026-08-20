 'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  ChevronRight,
  Edit3,
  Heart,
  Loader2,
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
  togglePostLike,
  type FeedPost,
  updateGlobalPost,
} from '@/app/actions/social-network';
import { listDiscoverUsers, sendConnectionRequest, type DiscoverUser } from '@/app/actions/connections';
import { FeedPostListSkeleton, SuggestedUsersSkeleton } from '@/components/feed/feed-skeletons';
import { FEED_PAGE_SIZE } from '@/lib/social/pagination';
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
    label: 'Marketplace',
    icon: Rss,
    description: 'Browse and fund collateral-backed loans.',
  },
  BORROWER: {
    href: '/dashboard/apply',
    label: 'Loan Applications',
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
  likesBusy,
  onToggleLike,
  onDelete,
  onEdit,
}: {
  item: FeedPost;
  canManage: boolean;
  likesBusy: boolean;
  onToggleLike: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, content: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [nextText, setNextText] = useState(item.content);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-[#111]"
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#F97316]/20 text-[11px] font-black text-[#F97316]">
            {item.author_name.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{item.author_name}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-neutral-400">
              {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="rounded-lg p-1.5 text-gray-500 transition hover:bg-[#F97316]/10 hover:text-[#F97316] dark:text-neutral-400"
            >
              <Edit3 size={14} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="rounded-lg p-1.5 text-gray-500 transition hover:bg-red-500/10 hover:text-red-400 dark:text-neutral-400"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2 p-4 pb-0">
        {editing ? (
          <>
            <textarea
              value={nextText}
              onChange={(e) => setNextText(e.target.value)}
              className="min-h-24 w-full rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-500 focus:border-[#F97316]/60 dark:border-gray-700 dark:text-white"
            />
            <div className="flex justify-end gap-2 pb-4">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-neutral-300"
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
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900 dark:text-gray-100">{item.content}</p>
        )}
        <p className="pb-3 text-[10px] text-gray-500 dark:text-neutral-500">
          {new Date(item.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      </div>

      {/* Engagement bar — likes work on global posts and Platform Announcements. */}
      <div className="mt-0 flex items-center border-t border-gray-100 px-4 py-3 dark:border-gray-800">
        <button
          type="button"
          onClick={() => onToggleLike(item.id)}
          disabled={likesBusy}
          title="Like this post"
          className={cn(
            'flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-60',
            item.liked_by_me
              ? 'text-orange-500'
              : 'text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-500'
          )}
        >
          <Heart
            size={18}
            className={cn(
              'transition-colors',
              item.liked_by_me ? 'fill-orange-500 text-orange-500' : 'fill-transparent'
            )}
          />
          <span>
            {item.likes_count} {item.likes_count === 1 ? 'Like' : 'Likes'}
          </span>
        </button>
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
  const cleanBio = (user.bio ?? '').trim();
  const subtitle = `${user.username ? `@${user.username}` : '@oxyile'} • ${cleanBio || 'Oxyile User'}`;
  const profileHref = user.username ? `/profile/${user.username}` : '/search';

  return (
    <div className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-neutral-100 dark:hover:bg-white/5">
      <Link href={profileHref} className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#F97316]/60 to-[#F97316]/20 text-sm font-bold text-white">
        {user.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar_url} alt={displayName} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          initials
        )}
      </Link>

      <Link href={profileHref} className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
          {displayName}
        </p>
        <p className="truncate text-xs text-gray-500 dark:text-neutral-400">{subtitle}</p>
      </Link>

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
  const [likesPendingIds, setLikesPendingIds] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);

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

        const profilePromise = user
          ? supabase.from('profiles').select('role, full_legal_name').eq('id', user.id).maybeSingle()
          : Promise.resolve({ data: null });

        const [profileSettled, postsSettled, suggestionsSettled] = await Promise.allSettled([
          profilePromise,
          listGlobalPosts(FEED_PAGE_SIZE, 0),
          listDiscoverUsers(7),
        ]);

        if (!mounted) return;

        if (user) {
          setMyId(user.id);
          if (profileSettled.status === 'fulfilled') {
            const profile = (profileSettled.value as { data?: { role?: string; full_legal_name?: string } | null })
              .data;
            setRole(profile?.role ?? null);
            setDisplayName(
              profile?.full_legal_name ?? user.email?.split('@')[0] ?? 'there'
            );
          }
        }

        if (postsSettled.status === 'fulfilled') {
          setPosts(postsSettled.value);
          setHasMorePosts(postsSettled.value.length >= FEED_PAGE_SIZE);
        } else {
          setPostsError(
            postsSettled.reason instanceof Error
              ? postsSettled.reason.message
              : 'Failed to load posts.'
          );
        }
        setPostsLoading(false);

        if (suggestionsSettled.status === 'fulfilled') {
          setSuggestions(suggestionsSettled.value);
        } else {
          setSuggestionsError(
            suggestionsSettled.reason instanceof Error
              ? suggestionsSettled.reason.message
              : 'Failed to load suggestions.'
          );
        }
        setSuggestionsLoading(false);
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
    return () => {
      mounted = false;
    };
  }, []);

  const loadMorePosts = () => {
    if (loadingMore || !hasMorePosts) return;
    setLoadingMore(true);
    startTransition(async () => {
      try {
        const next = await listGlobalPosts(FEED_PAGE_SIZE, posts.length);
        setPosts((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...next.filter((p) => !seen.has(p.id))];
        });
        setHasMorePosts(next.length >= FEED_PAGE_SIZE);
      } catch {
        // keep existing posts; button remains available
      } finally {
        setLoadingMore(false);
      }
    });
  };

  const portalConfig = role ? PORTAL_MAP[role] ?? null : null;
  const canCreatePost = role ? ['ADMIN', 'HR', 'BLOGGER', 'SOCIAL_MANAGER'].includes(role) : false;
  const canManageAnyPost = role === 'ADMIN';

  const visibleSuggestions = useMemo(
    () => suggestions.filter((u) => u.connection_status !== 'accepted').slice(0, 7),
    [suggestions]
  );

  return (
    <div className="mx-auto w-full max-w-6xl pb-4 text-gray-900 dark:text-white">
      {/* ── Page header ── */}
      <div className="mb-5 flex items-start justify-between gap-3 sm:mb-6 sm:items-center sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-black text-gray-900 dark:text-white sm:text-2xl">
            Hey{displayName ? `, ${displayName}` : ''}
          </h1>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-neutral-400 sm:text-sm">
            Here&apos;s what&apos;s happening on the platform today.
          </p>
        </div>

        <Link
          href="/search"
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-[#F97316]/40 bg-[#F97316]/10 px-3 text-xs font-bold text-[#F97316] transition hover:bg-[#F97316]/15 active:scale-95 sm:h-11 sm:px-4"
          aria-label="Search friends"
        >
          <Users size={15} />
          <span className="hidden xs:inline sm:inline">Find friends</span>
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6">
        {/* ────────────── LEFT: Feed ────────────── */}
        <div className="min-w-0 space-y-4">
          {/* Go to My Portal card */}
          {portalConfig && (
            <Link
              href={portalConfig.href}
              className="flex items-center gap-3 rounded-2xl border border-[#F97316]/30 bg-[#F97316]/5 p-3.5 transition hover:border-[#F97316]/60 hover:bg-[#F97316]/10 sm:gap-4 sm:p-4"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#F97316]/10 text-[#F97316] sm:h-11 sm:w-11">
                <portalConfig.icon size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900 dark:text-white sm:text-base">Go to My Portal</p>
                <p className="truncate text-xs text-gray-600 dark:text-neutral-400 sm:text-sm">{portalConfig.description}</p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-[#F97316]" />
            </Link>
          )}

          {/* Create post composer */}
          {canCreatePost && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-[#111]">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-gray-500 dark:text-neutral-400">Create Post</p>
              <textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="Share an update with everyone..."
                className="min-h-24 w-full rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-500 focus:border-[#F97316]/60 dark:border-gray-700 dark:text-white"
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  disabled={!postText.trim() || isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const content = postText.trim();
                      if (!content) return;
                      const optimisticId = `optimistic-${Date.now()}`;
                      const optimistic: FeedPost = {
                        id: optimisticId,
                        content,
                        media_url: null,
                        created_at: new Date().toISOString(),
                        author_id: myId,
                        author_name: displayName || 'You',
                        author_role: role ?? '',
                        author_avatar: null,
                        likes_count: 0,
                        liked_by_me: false,
                      };
                      setPostText('');
                      setPosts((prev) => [optimistic, ...prev]);
                      const res = await createGlobalPost({ content });
                      if (!res.ok) {
                        setPostText(content);
                        setPosts((prev) => prev.filter((p) => p.id !== optimisticId));
                        return;
                      }
                      const fresh = await listGlobalPosts(FEED_PAGE_SIZE, 0);
                      setPosts(fresh);
                      setHasMorePosts(fresh.length >= FEED_PAGE_SIZE);
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
            <h2 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-gray-500 dark:text-neutral-400">
              <Sparkles size={13} />
              Global Feed
            </h2>

            {postsLoading ? (
              <FeedPostListSkeleton count={4} />
            ) : postsError ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
                <p className="text-sm font-semibold text-red-300">Could not load posts</p>
                <p className="mt-1 text-xs text-red-200/80">{postsError}</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 py-12 text-center dark:border-neutral-800">
                <Sparkles size={28} className="mx-auto mb-3 text-neutral-600" />
                <p className="text-sm text-gray-500 dark:text-neutral-400">No posts yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((item) => (
                  <FeedPostCard
                    key={item.id}
                    item={item}
                    canManage={!item.id.startsWith('legacy-') && !item.id.startsWith('optimistic-') && (canManageAnyPost || item.author_id === myId)}
                    likesBusy={Boolean(likesPendingIds[item.id])}
                    onToggleLike={(id) => {
                      if (id.startsWith('optimistic-')) return;
                      const prev = posts;
                      setLikesPendingIds((curr) => ({ ...curr, [id]: true }));
                      setPosts((curr) =>
                        curr.map((post) =>
                          post.id !== id
                            ? post
                            : {
                                ...post,
                                liked_by_me: !post.liked_by_me,
                                likes_count: Math.max(0, post.likes_count + (post.liked_by_me ? -1 : 1)),
                              }
                        )
                      );
                      startTransition(async () => {
                        const res = await togglePostLike(id);
                        if (!res.ok) {
                          setPosts(prev);
                        }
                        setLikesPendingIds((curr) => {
                          const next = { ...curr };
                          delete next[id];
                          return next;
                        });
                      });
                    }}
                    onDelete={(id) =>
                      startTransition(async () => {
                        const snapshot = posts;
                        setPosts((curr) => curr.filter((p) => p.id !== id));
                        const res = await deleteGlobalPost(id);
                        if (!res.ok) setPosts(snapshot);
                      })
                    }
                    onEdit={(id, content) =>
                      startTransition(async () => {
                        const snapshot = posts;
                        setPosts((curr) =>
                          curr.map((p) => (p.id === id ? { ...p, content } : p))
                        );
                        const res = await updateGlobalPost({ id, content });
                        if (!res.ok) setPosts(snapshot);
                      })
                    }
                  />
                ))}
                {hasMorePosts ? (
                  <button
                    type="button"
                    onClick={loadMorePosts}
                    disabled={loadingMore}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#F97316]/35 bg-[#F97316]/10 py-3 text-xs font-bold text-[#F97316] transition hover:bg-[#F97316]/15 disabled:opacity-60"
                  >
                    {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* ────────────── RIGHT: Suggested connections ────────────── */}
        <aside className="min-w-0 space-y-3 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-gray-200 bg-white p-3.5 dark:border-neutral-800 dark:bg-[#111] sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-gray-500 dark:text-neutral-400">
                <Users size={13} />
                Suggested
              </h2>
              <Link href="/search" className="text-[11px] font-bold text-[#F97316] hover:underline">
                See all
              </Link>
            </div>

            {suggestionsLoading ? (
              <SuggestedUsersSkeleton count={5} />
            ) : suggestionsError ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="text-xs font-semibold text-amber-200">Could not load suggestions</p>
                <p className="mt-1 text-[11px] text-amber-100/80">{suggestionsError}</p>
              </div>
            ) : visibleSuggestions.length === 0 ? (
              <p className="py-4 text-center text-xs text-gray-500 dark:text-neutral-400">No suggestions found right now.</p>
            ) : (
              <div className="space-y-1">
                {visibleSuggestions.map((u) => (
                  <SuggestedUserRow key={u.id} user={u} />
                ))}
              </div>
            )}

            <Link
              href="/search"
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#F97316]/30 py-2.5 text-xs font-semibold text-[#F97316] transition hover:bg-[#F97316]/5"
            >
              <UserPlus size={13} />
              Search &amp; Add Friends
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
