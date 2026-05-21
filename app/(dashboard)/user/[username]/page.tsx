'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { UserProfile, type PublicProfileCard } from '@/components/dashboard/user-profile';

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'user';
}

export default function PublicUserProfilePage() {
  const params = useParams<{ username: string }>();
  const username = useMemo(() => (params?.username || '').toString(), [params]);
  const [profile, setProfile] = useState<PublicProfileCard | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('id, role, full_legal_name, username, bio, avatar_url, cover_url')
        .eq('status', 'APPROVED')
        .or(`username.eq.${username},full_legal_name.ilike.${username.replace(/_/g, ' ')}`)
        .limit(100);

      const rows = (data ?? []) as PublicProfileCard[];
      const match = rows.find((row) => (row.username || toSlug(row.full_legal_name)) === username) ?? null;
      setProfile(match);
    }

    if (username) void load();
  }, [username]);

  if (!profile) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="glass-card rounded-2xl p-6 text-sm text-neutral-500">Profile not found.</div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <UserProfile profile={profile} />
      <div className="mt-5">
        <Link
          href={`/chats/${profile.id}`}
          className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-glow hover:bg-brand-400"
        >
          <MessageCircle size={16} /> Start Messaging
        </Link>
      </div>
    </section>
  );
}
