'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Loader2, Pencil, User } from 'lucide-react';
import { getAdminProfile, type AdminProfileRow } from '@/app/actions/admin-profile';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function AdminProfileView() {
  const [profile, setProfile] = useState<AdminProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProfile(await getAdminProfile());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-brand-500" size={32} />
      </div>
    );
  }

  if (!profile) {
    return <p className="text-center text-sm text-neutral-500">Profile not found.</p>;
  }

  const name = profile.display_name ?? 'Admin';

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl">
      <article className="glass-card overflow-hidden rounded-3xl border border-white/60 shadow-glass dark:border-white/10">
        <div className="relative h-48 w-full overflow-hidden">
          {profile.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.cover_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-brand-900/80">
              <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-brand-500/30 blur-2xl" />
              <div className="absolute -bottom-10 left-10 h-32 w-32 rounded-full bg-orange-400/20 blur-2xl" />
            </div>
          )}
        </div>

        <div className="relative px-4 pb-8 pt-0 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="-mt-16 h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-white bg-white shadow-glow dark:border-neutral-950 dark:bg-neutral-950 sm:h-32 sm:w-32">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt={name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-gradient-to-br from-brand-500/20 to-orange-200/30">
                    <span className="text-2xl font-black text-brand-600">{initials(name)}</span>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex flex-col gap-1 sm:pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black text-neutral-950 dark:text-white sm:text-3xl">{name}</h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs font-bold text-brand-700 dark:text-brand-300">
                    <BadgeCheck size={14} /> Admin
                  </span>
                </div>
                {profile.email && (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">{profile.email}</p>
                )}
              </div>
            </div>

            <Link
              href="/admin-dashboard/profile/edit"
              className="ml-auto inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-glow hover:bg-brand-400"
            >
              <Pencil size={16} />
              Edit profile
            </Link>
          </div>

          <div className="mt-8 rounded-2xl border border-white/50 bg-white/40 p-5 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">
              <User size={16} />
              Bio
            </div>
            <p className="mt-3 text-sm leading-7 text-neutral-700 dark:text-neutral-300">
              {profile.bio?.trim() ? profile.bio : 'No bio yet. Add one from Edit profile.'}
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
