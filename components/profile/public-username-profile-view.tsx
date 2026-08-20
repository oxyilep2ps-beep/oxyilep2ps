'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Check, Loader2, MessageCircle, UserPlus } from 'lucide-react';
import {
  acceptFriendRequest,
  getPublicProfileByUsername,
  sendConnectionRequest,
  type PublicSocialProfile,
} from '@/app/actions/connections';
import { UserProfile } from '@/components/dashboard/user-profile';
import { cn } from '@/lib/utils';

export function PublicUsernameProfileView() {
  const params = useParams<{ username: string }>();
  const username = String(params?.username ?? '');
  const [profile, setProfile] = useState<PublicSocialProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    const row = await getPublicProfileByUsername(username);
    setProfile(row);
    setLoading(false);
  }, [username]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={22} className="animate-spin text-[#F97316]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <section className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-[#111]">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Profile not found</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
            That username doesn&apos;t match an Oxyile member.
          </p>
          <Link href="/search" className="mt-4 inline-block text-sm font-bold text-[#F97316] hover:underline">
            Search friends
          </Link>
        </div>
      </section>
    );
  }

  const onConnect = () => {
    startTransition(async () => {
      const res = await sendConnectionRequest(profile.id);
      if (res.ok) await load();
    });
  };

  const onAccept = () => {
    if (!profile.connection_id) return;
    startTransition(async () => {
      const res = await acceptFriendRequest(profile.connection_id!);
      if (res.ok) await load();
    });
  };

  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <UserProfile
        profile={{
          id: profile.id,
          role: profile.role,
          full_legal_name: profile.full_legal_name,
          username: profile.username,
          bio: profile.bio,
          avatar_url: profile.avatar_url,
          cover_url: profile.cover_url,
        }}
      />

      {!profile.is_self ? (
        <div className="flex flex-wrap items-center gap-2">
          {profile.connection_status === 'none' ? (
            <button
              type="button"
              disabled={pending}
              onClick={onConnect}
              className="inline-flex items-center gap-2 rounded-full bg-[#F97316] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#ea580c] active:scale-95 disabled:opacity-60"
            >
              {pending ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
              Connect
            </button>
          ) : null}

          {profile.connection_status === 'pending_sent' ? (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-500 dark:border-neutral-700 dark:bg-white/5 dark:text-neutral-400"
            >
              <Check size={15} />
              Sent
            </button>
          ) : null}

          {profile.connection_status === 'pending_received' ? (
            <button
              type="button"
              disabled={pending}
              onClick={onAccept}
              className="inline-flex items-center gap-2 rounded-full bg-[#F97316] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#ea580c] active:scale-95 disabled:opacity-60"
            >
              {pending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              Accept
            </button>
          ) : null}

          {profile.connection_status === 'accepted' ? (
            <Link
              href={`/chats/${profile.id}`}
              className={cn(
                'inline-flex items-center gap-2 rounded-full bg-[#F97316] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#ea580c] active:scale-95'
              )}
            >
              <MessageCircle size={15} />
              Message
            </Link>
          ) : null}

          {profile.username ? (
            <Link
              href={`/chat`}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#F97316]/40 hover:text-[#F97316] dark:border-neutral-700 dark:text-neutral-300"
            >
              Open Inbox
            </Link>
          ) : null}
        </div>
      ) : (
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 rounded-full border border-[#F97316]/40 bg-[#F97316]/10 px-5 py-2.5 text-sm font-bold text-[#F97316]"
        >
          Edit your profile
        </Link>
      )}
    </section>
  );
}
