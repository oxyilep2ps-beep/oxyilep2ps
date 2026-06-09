'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell, Handshake, Loader2, Sparkles, Store, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { getRecentAnnouncements, type Announcement } from '@/app/actions/announcements';
import { DiscoveryFeed } from '@/components/dashboard/discovery-feed';
import { createClient } from '@/lib/supabase/client';
import { isApprovedStatus } from '@/lib/auth/profile-status';

export function MainHub() {
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<'BORROWER' | 'INVESTOR' | null>(null);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const result = await getRecentAnnouncements(8);
      setAnnouncements(result.announcements);
      setError(result.error ?? null);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role, status').eq('id', user.id).maybeSingle();
        if (profile?.role === 'BORROWER' || profile?.role === 'INVESTOR') {
          setRole(profile.role);
        }
        setApproved(isApprovedStatus(profile?.status as string | undefined));
      }

      setLoading(false);
    }
    void load();
  }, []);

  return (
    <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black text-neutral-950 dark:text-white">Main Hub</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Platform updates, announcements, and recommended connections.
        </p>
      </motion.div>

      {approved && role === 'BORROWER' ? (
        <Link
          href="/dashboard/apply"
          className="glass-card mt-6 flex items-center gap-4 rounded-2xl border border-brand-200/60 p-5 transition hover:border-brand-400 dark:border-brand-500/30"
        >
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-500/10 text-brand-500">
            <Handshake size={22} />
          </span>
          <div>
            <p className="font-bold text-neutral-950 dark:text-white">Apply for Loan</p>
            <p className="text-sm text-neutral-500">Submit a collateral-backed application to the marketplace.</p>
          </div>
        </Link>
      ) : null}

      {approved && role === 'INVESTOR' ? (
        <Link
          href="/dashboard/marketplace"
          className="glass-card mt-6 flex items-center gap-4 rounded-2xl border border-brand-200/60 p-5 transition hover:border-brand-400 dark:border-brand-500/30"
        >
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-500/10 text-brand-500">
            <Store size={22} />
          </span>
          <div>
            <p className="font-bold text-neutral-950 dark:text-white">Available Opportunities</p>
            <p className="text-sm text-neutral-500">Fund collateral-backed loans at a fixed 10% return.</p>
          </div>
          <TrendingUp className="ml-auto text-brand-500" size={20} />
        </Link>
      ) : null}

      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <Bell size={18} className="text-brand-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">
            Announcements
          </h2>
        </div>

        {loading ? (
          <div className="glass-card flex items-center justify-center rounded-2xl p-10">
            <Loader2 size={22} className="animate-spin text-brand-500" />
          </div>
        ) : error ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            {error} — Run <code className="text-xs">supabase_phase2_migrations.sql</code> in Supabase.
          </p>
        ) : announcements.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 text-center text-sm text-neutral-500">
            No announcements yet. Check back soon.
          </div>
        ) : (
          <ul className="space-y-3">
            {announcements.map((item, index) => (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <article className="glass-card rounded-2xl border border-white/60 p-5 dark:border-white/10">
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-500">
                      <Sparkles size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-neutral-950 dark:text-white">{item.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                        {item.content}
                      </p>
                      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                        {new Date(item.created_at).toLocaleString('en-GB', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                  </div>
                </article>
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      <DiscoveryFeed />
    </section>
  );
}
