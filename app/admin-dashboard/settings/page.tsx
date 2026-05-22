'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, User } from 'lucide-react';
import { AdminAnnouncementsTab } from '@/components/admin/admin-announcements-tab';
import { createClient } from '@/lib/supabase/client';

export default function AdminSettingsPage() {
  const router = useRouter();

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/signin');
    router.refresh();
  };

  return (
    <div className="w-full min-w-0 space-y-8 overflow-x-auto">
      <div>
        <h1 className="text-2xl font-black text-neutral-950 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Platform announcements and session controls.
        </p>
      </div>

      <Link
        href="/admin-dashboard/profile"
        className="glass-card flex items-center gap-4 rounded-2xl p-5 transition hover:bg-brand-500/5"
      >
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/15 text-brand-600">
          <User size={22} />
        </span>
        <div>
          <p className="font-bold text-neutral-950 dark:text-white">Admin profile settings</p>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">Avatar, cover photo, and bio</p>
        </div>
      </Link>

      <AdminAnnouncementsTab />

      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-lg font-bold text-neutral-950 dark:text-white">Session</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">Sign out of the admin portal on this device.</p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-red-500"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
