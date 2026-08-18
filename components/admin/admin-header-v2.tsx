'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Mail, Menu, Search } from 'lucide-react';
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

export function AdminHeaderV2({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [openResults, setOpenResults] = useState(false);
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
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpenResults(true);
      }
      if (e.key === 'Escape') setOpenResults(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return ADMIN_NAV_FLAT.filter((item) => item.label.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 bg-white/80 px-4 backdrop-blur-md dark:border-gray-800 dark:bg-black/80 lg:px-6">
      <button
        type="button"
        onClick={onOpenSidebar}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:text-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:text-white lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu size={18} />
      </button>

      <div className="relative min-w-0 flex-1">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpenResults(true);
          }}
          onFocus={() => setOpenResults(true)}
          onBlur={() => window.setTimeout(() => setOpenResults(false), 150)}
          placeholder="Search admin modules…"
          className="h-10 w-full max-w-xl rounded-xl border border-gray-200 bg-gray-100 pl-9 pr-16 text-sm text-gray-900 placeholder:text-gray-500 focus:border-[#F97316]/50 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-400"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-md border border-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:border-gray-800 dark:text-gray-400 sm:inline">
          ⌘ K
        </span>
        {openResults && results.length > 0 ? (
          <ul className="absolute z-40 mt-2 w-full max-w-xl overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-2xl dark:border-gray-800 dark:bg-[#111]">
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
        ) : null}
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <Link
          href="/admin-dashboard/chat"
          aria-label="Messages"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-[#F97316]/40 hover:text-[#F97316] dark:border-gray-800 dark:text-gray-400"
        >
          <Mail size={16} />
        </Link>
        <AdminNotificationBell />
        <ThemeToggle className="h-10 w-10" />

        <Link
          href="/admin-dashboard/profile"
          className="flex min-w-0 items-center gap-3 rounded-xl py-1 pl-0.5 pr-1 transition hover:bg-gray-100 dark:hover:bg-white/5"
        >
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-800"
            />
          ) : (
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F97316]/20 text-xs font-black text-[#F97316] ring-2 ring-gray-200 dark:ring-gray-800">
              {initials(profile.name)}
            </span>
          )}
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-sm font-bold leading-tight text-gray-900 dark:text-white">
              {profile.name}
            </span>
            <span className="block truncate text-[11px] leading-tight text-gray-500 dark:text-gray-400">
              {profile.email || 'admin@oxyile.com'}
            </span>
          </span>
        </Link>
      </div>
    </header>
  );
}
