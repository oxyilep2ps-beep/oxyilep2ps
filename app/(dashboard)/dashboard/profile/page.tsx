'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { UserProfile, type PublicProfileCard } from '@/components/dashboard/user-profile';
import { DiscoveryFeed } from '@/components/dashboard/discovery-feed';

function fallbackUsername(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'user';
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<PublicProfileCard | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

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
    }

    void loadProfile();
  }, []);

  if (!profile) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="glass-card animate-pulse rounded-2xl p-8 text-sm text-neutral-500">Loading your profile…</div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <UserProfile profile={profile} />
      <DiscoveryFeed />
    </section>
  );
}
