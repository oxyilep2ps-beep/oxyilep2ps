'use client';

import { FormEvent, useState } from 'react';
import { Loader2, Mail, Send } from 'lucide-react';
import { sendCohortBroadcast, type BroadcastCohort } from '@/app/actions/admin-broadcast';

const COHORTS: { value: BroadcastCohort; label: string }[] = [
  { value: 'all_investors', label: 'All Investors' },
  { value: 'all_borrowers', label: 'All Borrowers' },
  { value: 'pending_waitlist', label: 'Pending Waitlist' },
  { value: 'defaulters', label: 'Defaulters' },
];

export function AdminEmailBroadcastTab() {
  const [cohort, setCohort] = useState<BroadcastCohort>('all_investors');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await sendCohortBroadcast({ cohort, subject, body });
      setResult(`Mock broadcast queued for ${res.recipientCount} recipients. Logged to audit trail.`);
      setSubject('');
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Broadcast failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 pb-28">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-500">Engagement</p>
        <h2 className="text-xl font-black text-neutral-950 dark:text-white">Cohort Email Campaigner</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Target user segments with bulk announcements (mock delivery — logged to system audit).
        </p>
      </div>

      <form onSubmit={onSubmit} className="glass-card max-w-2xl space-y-4 rounded-2xl p-6">
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Mail size={16} className="text-brand-500" />
            Cohort
          </span>
          <select
            value={cohort}
            onChange={(e) => setCohort(e.target.value as BroadcastCohort)}
            className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-black/40"
          >
            {COHORTS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Subject</span>
          <input
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-black/40"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Body</span>
          <textarea
            required
            rows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-black/40"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {result && <p className="text-sm text-emerald-700">{result}</p>}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Send Mock Broadcast
        </button>
      </form>
    </div>
  );
}
