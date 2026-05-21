'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Loader2, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { getRecommendedProfiles, type RecommendedProfile } from '@/app/actions/recommendations';

function displayUsername(profile: RecommendedProfile): string {
  return profile.username?.replace(/^@/, '') ?? profile.full_legal_name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function DiscoveryFeed() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<RecommendedProfile[]>([]);
  const [title, setTitle] = useState('Recommended Profiles');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const result = await getRecommendedProfiles();
      setProfiles(result.profiles);
      setTitle(result.title);
      setError(result.error ?? null);
      setLoading(false);
    }
    void load();
  }, []);

  if (loading) {
    return (
      <div className="glass-card mt-8 flex items-center justify-center rounded-2xl p-10 text-neutral-500">
        <Loader2 size={24} className="animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-black text-neutral-950 dark:text-white">{title}</h2>
      {error && (
        <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          {error}
        </p>
      )}
      {profiles.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-brand-200/60 bg-brand-500/5 p-5 text-sm text-neutral-600 dark:text-neutral-300">
          No approved matches yet. Once opposite-role users are approved, they will appear here.
        </p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile, i) => {
            const username = displayUsername(profile);
            return (
              <motion.li
                key={profile.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="glass-card flex h-full flex-col overflow-hidden rounded-2xl border border-white/60 transition hover:border-brand-300 hover:shadow-glow dark:border-white/10">
                  <div className="flex items-center gap-3 border-b border-white/40 p-4 dark:border-white/10">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-brand-500/10 ring-2 ring-brand-500/20">
                      {profile.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-xs font-bold text-brand-600">
                          {initials(profile.full_legal_name) || <User size={18} />}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-neutral-950 dark:text-white">{profile.full_legal_name}</p>
                      <p className="truncate text-xs font-semibold text-brand-600 dark:text-brand-300">@{username}</p>
                    </div>
                  </div>
                  <p className="flex-1 px-4 py-3 text-xs leading-5 text-neutral-600 dark:text-neutral-300">
                    {profile.bio || 'No bio yet.'}
                  </p>
                  <div className="p-4 pt-0">
                    <Link
                      href={`/user/${username}`}
                      className="inline-flex w-full items-center justify-center rounded-full bg-brand-500 py-2.5 text-xs font-semibold text-white shadow-glow transition hover:bg-brand-400"
                    >
                      View Profile
                    </Link>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
