'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { Loader2, Search, UserPlus, UserCheck, Clock, Check } from 'lucide-react';
import {
  acceptConnectionRequest,
  searchProfiles,
  sendConnectionRequest,
  type DiscoverUser,
} from '@/app/actions/connections';
import { cn } from '@/lib/utils';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function SearchResultRow({
  user,
  onChanged,
}: {
  user: DiscoverUser;
  onChanged: (next: DiscoverUser) => void;
}) {
  const [pending, startTransition] = useTransition();

  const handleConnect = () => {
    startTransition(async () => {
      if (user.connection_status === 'none') {
        const res = await sendConnectionRequest(user.id);
        if (res.ok) {
          onChanged({ ...user, connection_status: 'pending_sent', connection_id: res.id });
        }
        return;
      }
      if (user.connection_status === 'pending_received' && user.connection_id) {
        const res = await acceptConnectionRequest(user.connection_id);
        if (res.ok) {
          onChanged({ ...user, connection_status: 'accepted' });
        }
      }
    });
  };

  const label =
    user.connection_status === 'accepted'
      ? 'Friends'
      : user.connection_status === 'pending_sent'
        ? 'Requested'
        : user.connection_status === 'pending_received'
          ? 'Accept'
          : 'Add Friend';

  const Icon =
    user.connection_status === 'accepted'
      ? UserCheck
      : user.connection_status === 'pending_sent'
        ? Clock
        : user.connection_status === 'pending_received'
          ? Check
          : UserPlus;

  const canAct = user.connection_status === 'none' || user.connection_status === 'pending_received';

  return (
    <li className="flex items-center gap-2.5 rounded-2xl border border-gray-200 bg-white px-2.5 py-2.5 dark:border-neutral-800 dark:bg-[#111] sm:gap-3 sm:px-3 sm:py-3">
      <Link href={user.username ? `/user/${user.username}` : '#'} className="shrink-0">
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#F97316]/30 to-[#F97316]/10 text-sm font-bold text-[#F97316] sm:h-12 sm:w-12">
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(user.full_legal_name || '?')
          )}
        </div>
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
          {user.full_legal_name || 'Oxyile User'}
        </p>
        <p className="truncate text-xs font-semibold text-[#F97316]">
          @{user.username || 'oxyile'}
        </p>
      </div>
      <button
        type="button"
        disabled={pending || !canAct}
        onClick={handleConnect}
        className={cn(
          'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold transition active:scale-95 sm:gap-1.5 sm:px-3 sm:text-xs',
          user.connection_status === 'accepted'
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            : user.connection_status === 'pending_sent'
              ? 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-neutral-400'
              : 'bg-[#F97316] text-white hover:bg-[#ea580c]'
        )}
      >
        {pending ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
        <span className="max-w-[4.5rem] truncate sm:max-w-none">{label}</span>
      </button>
    </li>
  );
}

export function FriendSearchPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DiscoverUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 1) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    const rows = await searchProfiles(trimmed, 24);
    setResults(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void runSearch(query);
    }, 320);
    return () => window.clearTimeout(handle);
  }, [query, runSearch]);

  return (
    <section className="mx-auto w-full max-w-xl">
      <div className="mb-5 sm:mb-6">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#F97316]">Discover</p>
        <h1 className="mt-1 text-xl font-black text-gray-900 dark:text-white sm:text-2xl">Search for a friend</h1>
        <p className="mt-1 text-xs text-gray-600 dark:text-neutral-400 sm:text-sm">
          Find people by name or @username and send a connect request.
        </p>
      </div>

      <label className="relative mb-4 block sm:mb-5">
        <Search
          size={18}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or @username"
          autoComplete="off"
          className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#F97316]/50 focus:ring-2 focus:ring-[#F97316]/20 dark:border-neutral-800 dark:bg-[#111] dark:text-white dark:placeholder:text-neutral-500 sm:py-3.5"
        />
      </label>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={22} className="animate-spin text-[#F97316]" />
        </div>
      ) : !searched ? (
        <div className="rounded-2xl border border-dashed border-gray-300 py-14 text-center dark:border-neutral-800">
          <Search size={28} className="mx-auto mb-3 text-gray-400 dark:text-neutral-600" />
          <p className="text-sm text-gray-500 dark:text-neutral-400">Start typing to find friends</p>
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white py-14 text-center dark:border-neutral-800 dark:bg-[#111]">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">No users found</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">Try a different name or username</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {results.map((user) => (
            <SearchResultRow
              key={user.id}
              user={user}
              onChanged={(next) =>
                setResults((curr) => curr.map((row) => (row.id === next.id ? next : row)))
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}
