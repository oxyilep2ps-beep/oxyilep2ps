'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { UserProfile, type PublicProfileCard } from '@/components/dashboard/user-profile';
import { DiscoveryFeed } from '@/components/dashboard/discovery-feed';
import { ProfileFinancialHub } from '@/components/dashboard/profile-financial-hub';

function fallbackUsername(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'user'
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<PublicProfileCard | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadProfile() {
      setProfileLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setProfileLoading(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('id, role, full_legal_name, username, bio, avatar_url, cover_url')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        const result = data as PublicProfileCard;
        setProfile({
          ...result,
          username: result.username || fallbackUsername(result.full_legal_name),
        });
      }
      setProfileLoading(false);
    }

    void loadProfile();
  }, []);

  if (profileLoading) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="glass-card animate-pulse rounded-2xl p-8">
          <div className="h-40 rounded-xl bg-neutral-800/60" />
          <div className="mt-6 h-8 w-48 rounded bg-neutral-800/60" />
          <div className="mt-3 h-4 w-64 rounded bg-neutral-800/40" />
        </div>
        <div className="mt-6 animate-pulse rounded-3xl border border-neutral-800 bg-neutral-950/80 p-6">
          <div className="h-6 w-64 rounded bg-neutral-800" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="h-40 rounded-2xl bg-neutral-900/80" />
            <div className="h-40 rounded-2xl bg-neutral-900/80" />
          </div>
        </div>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="glass-card rounded-2xl p-8 text-sm text-neutral-500">
          Sign in to view your live financial portfolio.
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <UserProfile profile={profile} />
      <ProfileFinancialHub userId={profile.id} />
      <DiscoveryFeed />
    </section>
  );
}
