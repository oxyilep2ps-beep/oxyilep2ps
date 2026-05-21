'use client';

import { BadgeCheck, User } from 'lucide-react';

export interface PublicProfileCard {
  id: string;
  role: 'INVESTOR' | 'BORROWER';
  full_legal_name: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function DefaultCover() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-brand-900/80" />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(135deg, rgba(255,90,31,0.35) 25%, transparent 25%),
            linear-gradient(225deg, rgba(255,90,31,0.2) 25%, transparent 25%),
            linear-gradient(45deg, rgba(255,129,74,0.15) 25%, transparent 25%)
          `,
          backgroundSize: '48px 48px',
        }}
      />
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-brand-500/30 blur-2xl" />
      <div className="absolute -bottom-10 left-10 h-32 w-32 rounded-full bg-orange-400/20 blur-2xl" />
    </div>
  );
}

function DefaultAvatar({ name }: { name: string }) {
  return (
    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-neutral-200 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900">
      <div className="flex flex-col items-center gap-1">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-500/15 text-brand-500">
          <User size={28} strokeWidth={1.5} />
        </div>
        <span className="text-sm font-bold text-brand-600 dark:text-brand-300">{initials(name)}</span>
      </div>
    </div>
  );
}

export function UserProfile({ profile }: { profile: PublicProfileCard }) {
  const handle = profile.username ? `@${profile.username.replace(/^@/, '')}` : '@username';

  return (
    <article className="glass-card overflow-hidden rounded-3xl border border-white/60 shadow-glass dark:border-white/10">
      <div className="relative h-40 w-full sm:h-48">
        {profile.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.cover_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <DefaultCover />
        )}
      </div>

      <div className="relative px-4 pb-6 sm:px-6">
        <div className="-mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
          <div className="h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-white shadow-glow ring-2 ring-brand-500/20 dark:border-neutral-950">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.full_legal_name} className="h-full w-full object-cover" />
            ) : (
              <DefaultAvatar name={profile.full_legal_name} />
            )}
          </div>
          <span className="inline-flex w-fit rounded-full bg-brand-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-300">
            {profile.role === 'INVESTOR' ? 'Verified Investor' : 'Verified Borrower'}
          </span>
        </div>

        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-black text-neutral-950 dark:text-white">{profile.full_legal_name}</h2>
            <BadgeCheck size={20} className="text-brand-500" aria-label="Verified" />
          </div>
          <p className="mt-1 text-sm font-semibold text-brand-600 dark:text-brand-300">{handle}</p>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-700 dark:text-neutral-300">
            {profile.bio || 'Add a bio in Settings to tell the Oxyile community about your lending or borrowing goals.'}
          </p>
        </div>
      </div>
    </article>
  );
}
