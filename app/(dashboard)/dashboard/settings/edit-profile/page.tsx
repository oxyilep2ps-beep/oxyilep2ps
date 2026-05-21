'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { EditProfileSection } from '@/components/dashboard/edit-profile-section';

export default function EditProfilePage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href="/dashboard/settings"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 transition hover:text-brand-500 dark:text-brand-300"
      >
        <ArrowLeft size={16} />
        Settings
      </Link>
      <h1 className="text-2xl font-black text-neutral-950 dark:text-white">Edit Profile</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
        Update your username, bio, avatar, and cover photo.
      </p>
      <EditProfileSection />
    </section>
  );
}
