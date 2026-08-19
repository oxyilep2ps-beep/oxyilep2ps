'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Mail, Menu, Search, X } from 'lucide-react';
import { AdminNotificationBell } from '@/components/admin/admin-notification-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { getAdminProfile } from '@/app/actions/admin-profile';
import { ADMIN_NAV_FLAT } from '@/lib/admin/nav-config';
import { cn } from '@/lib/utils';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'AD';
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function AdminHeaderV2({
  onOpenSidebar,
  portalLabel,
  viewingAs,
}: {
  onOpenSidebar: () => void;
  /** Optional label shown beside the logo on non-admin portals */
  portalLabel?: string;
  /** When truthy, shows a "Viewing as X" badge — for admin View As mode */
  viewingAs?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [openResults, setOpenResults] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [profile, setProfile] = useState<{
    name: string;
    email: string;
    avatarUrl: string | null;
  }>({ name: 'Admin', email: '', avatarUrl: null });

  useEffect(() => {
    void getAdminProfile().then((row) => {
      if (!row) return;
      setProfile({
        name: row.display_name?.trim() || 'Admin',
        email: row.email?.trim() || '',
        avatarUrl: row.avatar_url,
      });
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchExpanded(true);
        inputRef.current?.focus();
        setOpenResults(true);
      }
      if (e.key === 'Escape') {
        setOpenResults(false);
        setSearchExpanded(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return ADMIN_NAV_FLAT.filter((item) => item.label.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  const closeSearch = () => {
    setOpenResults(false);
    setSearchExpanded(false);
    setQuery('');
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-gray-200 bg-white/80 px-3 backdrop-blur-md dark:border-gray-800 dark:bg-black/80 sm:gap-3 sm:px-4 lg:px-6">

      {/* Hamburger — hidden on lg */}
      {!searchExpanded && (
        <button
          type="button"
          onClick={onOpenSidebar}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:text-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:text-white lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu size={18} />
        </button>
      )}

      {/* Portal label / View As badge — desktop only */}
      {!searchExpanded && (viewingAs ?? portalLabel) ? (
        <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-[#F97316]/40 bg-[#F97316]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#F97316] lg:inline-flex">
          {viewingAs ? `👁 Viewing as ${viewingAs}` : portalLabel}
        </span>
      ) : null}

      {/* Search — collapsed icon on mobile, full bar on sm+ */}
      {searchExpanded ? (
        /* Full-width expanded search (mobile tap) */
        <div className="relative flex min-w-0 flex-1 items-center">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 text-gray-500 dark:text-gray-400"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpenResults(true);
            }}
            onFocus={() => setOpenResults(true)}
            onBlur={() => window.setTimeout(() => setOpenResults(false), 150)}
            autoFocus
            placeholder="Search modules…"
            className="h-9 w-full rounded-xl border border-gray-200 bg-gray-100 pl-8 pr-8 text-sm text-gray-900 outline-none placeholder:text-gray-500 focus:border-[#F97316]/50 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-400"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={closeSearch}
            className="absolute right-2 rounded p-0.5 text-gray-500 dark:text-gray-400"
            aria-label="Close search"
          >
            <X size={14} />
          </button>
          {openResults && results.length > 0 && (
            <ul className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-2xl dark:border-gray-800 dark:bg-[#111]">
              {results.map((item) => (
                <li key={`${item.href}-${item.label}`}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-[#F97316]/10 hover:text-[#F97316] dark:text-gray-200',
                      pathname.startsWith(item.href) && 'text-[#F97316]'
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      router.push(item.href);
                      closeSearch();
                    }}
                  >
                    <item.icon size={14} />
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          {/* Search icon-only on small screens */}
          <button
            type="button"
            onClick={() => {
              setSearchExpanded(true);
              window.setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400 sm:hidden"
            aria-label="Search"
          >
            <Search size={16} />
          </button>

          {/* Full search bar on sm+ */}
          <div className="relative hidden min-w-0 flex-1 sm:block">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpenResults(true);
              }}
              onFocus={() => setOpenResults(true)}
              onBlur={() => window.setTimeout(() => setOpenResults(false), 150)}
              placeholder="Search modules… (⌘K)"
              className="h-9 w-full max-w-md rounded-xl border border-gray-200 bg-gray-100 pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-500 focus:border-[#F97316]/50 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-400"
              autoComplete="off"
            />
            {openResults && results.length > 0 && (
              <ul className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-full max-w-md overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-2xl dark:border-gray-800 dark:bg-[#111]">
                {results.map((item) => (
                  <li key={`${item.href}-${item.label}`}>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-[#F97316]/10 hover:text-[#F97316] dark:text-gray-200',
                        pathname.startsWith(item.href) && 'text-[#F97316]'
                      )}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        router.push(item.href);
                        setQuery('');
                        setOpenResults(false);
                      }}
                    >
                      <item.icon size={14} />
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {/* Right actions — always visible, shrink-0 so search never pushes them off */}
      {!searchExpanded && (
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link
            href="/admin-dashboard/chat"
            aria-label="Messages"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-[#F97316]/40 hover:text-[#F97316] dark:border-gray-800 dark:text-gray-400"
          >
            <Mail size={15} />
          </Link>
          <AdminNotificationBell />
          <ThemeToggle className="h-9 w-9" />

          {/* Profile — avatar always, name+email only on sm+ */}
          <Link
            href="/admin-dashboard/profile"
            className="flex min-w-0 items-center gap-2 rounded-xl py-1 pl-0.5 pr-1 transition hover:bg-gray-100 dark:hover:bg-white/5"
          >
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-800"
              />
            ) : (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#F97316]/20 text-[11px] font-black text-[#F97316] ring-2 ring-gray-200 dark:ring-gray-800">
                {initials(profile.name)}
              </span>
            )}
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-[100px] truncate text-xs font-bold leading-tight text-gray-900 dark:text-white">
                {profile.name}
              </span>
              <span className="block max-w-[100px] truncate text-[10px] leading-tight text-gray-500 dark:text-gray-400">
                {profile.email || 'admin@oxyile.com'}
              </span>
            </span>
          </Link>
        </div>
      )}
    </header>
  );
}
