'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { EditProfileSection } from '@/components/dashboard/edit-profile-section';

export function SharedProfileEditView({
  backHref,
  backLabel = 'Back',
}: {
  backHref: string;
  backLabel?: string;
}) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href={backHref}
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#F97316] transition hover:text-[#fb923c]"
      >
        <ArrowLeft size={16} />
        {backLabel}
      </Link>
      <h1 className="text-2xl font-black text-white">Edit Profile</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Update your bio, avatar, username, and details for your social presence.
      </p>
      <EditProfileSection />
    </section>
  );
}
