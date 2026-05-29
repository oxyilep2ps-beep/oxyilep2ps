'use client';

import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Loader2, Upload } from 'lucide-react';
import { Footer } from '@/components/footer';

export default function RaiseComplaintPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set('name', name);
      fd.set('email', email);
      fd.set('description', description);
      if (screenshot) fd.set('screenshot', screenshot);

      const res = await fetch('/api/complaints', { method: 'POST', body: fd });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) throw new Error(body.error ?? 'Submission failed');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit complaint');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm uppercase tracking-[0.3em] text-brand-500">Support</p>
        <h1 className="mt-3 flex items-center gap-3 text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
          <AlertTriangle className="text-brand-500" />
          Raise a Complaint
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
          Formal complaints are logged for our compliance team. We aim to acknowledge within 2 business days.
        </p>

        {done ? (
          <div className="glass-card mt-8 rounded-2xl p-8 text-center">
            <CheckCircle2 className="mx-auto text-emerald-500" size={40} />
            <p className="mt-4 font-bold">Complaint received</p>
            <p className="mt-2 text-sm text-neutral-500">Reference logged. Our team will contact you at {email}.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="glass-card mt-8 space-y-4 rounded-2xl p-6">
            <input
              required
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-black/40"
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-black/40"
            />
            <textarea
              required
              rows={6}
              placeholder="Describe your issue in detail"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-black/40"
            />
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-bold text-white">
              <Upload size={16} />
              Attach screenshot (optional)
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
              />
            </label>
            {screenshot && <p className="text-xs text-neutral-500">Attached: {screenshot.name}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-3 font-bold text-white disabled:opacity-60"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : null}
              Submit complaint
            </button>
          </form>
        )}
      </motion.div>
      <Footer />
    </section>
  );
}
