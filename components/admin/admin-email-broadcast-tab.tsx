'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Loader2, Mail, Megaphone, Send } from 'lucide-react';
import { listNewsletterCampaigns, type NewsletterCampaignRow } from '@/app/actions/newsletter-campaigns';

export function AdminEmailBroadcastTab() {
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<NewsletterCampaignRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const rows = await listNewsletterCampaigns();
      setCampaigns(rows);
    } catch {
      setCampaigns([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setToast(null);

    try {
      const res = await fetch('/api/newsletter/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, html_content: htmlContent }),
      });

      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        recipientCount?: number;
      };

      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? 'Broadcast failed');
      }

      setToast(body.message ?? `Newsletter sent to ${body.recipientCount ?? 0} recipients.`);
      setSubject('');
      setHtmlContent('');
      void loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Broadcast failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8 pb-28">
      <div>
        <div className="flex items-center gap-2">
          <Megaphone className="text-brand-500" size={22} />
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-500">CEO Communications</p>
        </div>
        <h2 className="mt-2 text-2xl font-black text-neutral-950 dark:text-white">Newsletter Broadcast</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Send platform updates to every registered profile and waitlist subscriber via Resend.
        </p>
      </div>

      {toast ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
          {toast}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="glass-card max-w-3xl space-y-5 rounded-[1.75rem] p-6 sm:p-8">
        <div className="flex items-center gap-2 border-b border-white/40 pb-4 dark:border-white/10">
          <Mail size={18} className="text-brand-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
            Compose Email
          </h3>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Email Subject *</span>
          <input
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Oxyile Q2 Platform Update"
            className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-black/40"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Email Body (HTML/Text) *</span>
          <textarea
            required
            rows={12}
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            placeholder={'<p>Dear Oxyile community,</p>\n<p>We are excited to share...</p>'}
            className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 font-mono text-sm leading-relaxed dark:border-white/10 dark:bg-black/40"
          />
          <p className="mt-2 text-xs text-neutral-500">
            Supports HTML markup. Plain text is also accepted and will be wrapped by the mail client.
          </p>
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-3.5 text-sm font-bold text-white shadow-glow disabled:opacity-60 sm:w-auto"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          Send Broadcast to All Users
        </button>
      </form>

      <section className="glass-card rounded-[1.75rem] p-6 sm:p-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">
          Campaign History
        </h3>
        <p className="mt-1 text-xs text-neutral-500">Past newsletter broadcasts from the admin team.</p>

        {loadingHistory ? (
          <div className="mt-6 flex justify-center py-10">
            <Loader2 size={22} className="animate-spin text-brand-500" />
          </div>
        ) : campaigns.length === 0 ? (
          <p className="mt-6 text-sm text-neutral-500">
            No campaigns yet. Run <code className="text-xs">supabase_phase22_migrations.sql</code> and send your first
            broadcast.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-xl border border-white/40 dark:border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200/80 text-xs uppercase tracking-wider text-neutral-500 dark:border-white/10">
                  <th className="px-4 py-3 font-bold">Date</th>
                  <th className="px-4 py-3 font-bold">Subject</th>
                  <th className="px-4 py-3 font-bold">Recipients</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((row) => (
                  <tr key={row.id} className="border-b border-neutral-100 dark:border-white/5">
                    <td className="px-4 py-3 whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                      {new Date(row.created_at).toLocaleString('en-GB', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-950 dark:text-white">{row.subject}</td>
                    <td className="px-4 py-3">{row.recipient_count.toLocaleString('en-GB')}</td>
                    <td className="px-4 py-3 capitalize">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
