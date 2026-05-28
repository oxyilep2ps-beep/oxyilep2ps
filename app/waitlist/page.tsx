'use client';

import { FormEvent, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { CheckCircle2, Loader2, Mail, MapPin, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { Footer } from '@/components/footer';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

function Section({ children }: { children: React.ReactNode }) {
  return <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">{children}</section>;
}

function ConfettiBurst() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 16 }).map((_, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 0, x: 0, scale: 0.4 }}
          animate={{ opacity: [0, 1, 0], y: [0, -90 - index * 2], x: [-10 + index, 20 - index], rotate: [0, 180 + index * 12] }}
          transition={{ duration: 1.1, delay: index * 0.02, ease: 'easeOut' }}
          className={`absolute left-1/2 top-1/2 h-3 w-3 rounded-sm ${index % 3 === 0 ? 'bg-brand-500' : index % 3 === 1 ? 'bg-amber-400' : 'bg-emerald-400'}`}
        />
      ))}
    </div>
  );
}

const QUESTIONS = [
  { key: 'uk_resident', label: 'Are you a UK resident?' },
  { key: 'understands_risk', label: 'Do you understand P2P lending carries risk?' },
  { key: 'marketing_consent', label: 'May we email you about launch updates?' },
];

export default function WaitlistPage() {
  const [submitted, setSubmitted] = useState(false);
  const [rank, setRank] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<'borrower' | 'investor'>('borrower');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [answers, setAnswers] = useState<Record<string, boolean>>({
    uk_resident: false,
    understands_risk: false,
    marketing_consent: true,
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          address,
          postal_code: postalCode,
          role,
          questionnaire_answers: Object.fromEntries(
            QUESTIONS.map((q) => [q.label, answers[q.key] ? 'Yes' : 'No'])
          ),
        }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string; waitlist_rank?: number };
      if (!res.ok || !body.ok) throw new Error(body.error ?? 'Submission failed');
      setRank(body.waitlist_rank ?? null);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join waitlist');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section>
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-6">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-500">Early access</p>
          <h1 className="text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">Join the Waitlist</h1>
          <p className="max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Be first in line when Oxyile opens for verified borrowers and investors across the UK.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: <Users size={18} />, title: 'Borrower or Investor', text: 'Tailored onboarding based on your role.' },
              { icon: <ShieldCheck size={18} />, title: 'Verified access', text: 'Compliance-first launch experience.' },
              { icon: <MapPin size={18} />, title: 'UK-wide', text: 'Register interest from any UK address.' },
              { icon: <Sparkles size={18} />, title: 'Queue position', text: 'Receive your waitlist rank instantly.' },
            ].map((item) => (
              <div key={item.title} className="glass-card rounded-[1.8rem] p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  {item.icon}
                </div>
                <p className="mt-4 font-semibold text-slate-950 dark:text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.text}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" className="glass-card relative overflow-hidden rounded-[2.25rem] p-7">
          <AnimatePresence>{submitted ? <ConfettiBurst /> : null}</AnimatePresence>
          <div className="relative">
            {submitted ? (
              <div className="mt-4 rounded-[1.8rem] border border-brand-200 bg-brand-500/5 p-7 text-center dark:border-brand-500/20 dark:bg-brand-500/10">
                <CheckCircle2 className="mx-auto text-brand-500" size={34} />
                <h3 className="mt-4 text-2xl font-bold text-slate-950 dark:text-white">You&apos;re on the list</h3>
                {rank != null && (
                  <p className="mt-2 text-lg font-black text-brand-600">Your position: #{rank}</p>
                )}
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Thanks for joining Oxyile. We&apos;ll reach out when your account type is ready.
                </p>
              </div>
            ) : (
              <form className="mt-4 space-y-4" onSubmit={onSubmit}>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Full name</span>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-black"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Email</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-black">
                    <Mail size={18} className="text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent outline-none"
                    />
                  </div>
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium">Phone</span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-black"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium">Postal code</span>
                    <input
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-black"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Address</span>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-black"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">I want to join as</span>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'borrower' | 'investor')}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-black"
                  >
                    <option value="borrower">Borrower</option>
                    <option value="investor">Investor</option>
                  </select>
                </label>
                <div className="space-y-2 rounded-2xl border border-white/50 bg-white/40 p-4 dark:border-white/10 dark:bg-black/30">
                  <p className="text-xs font-bold uppercase tracking-wider text-brand-500">Quick questions</p>
                  {QUESTIONS.map((q) => (
                    <label key={q.key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={answers[q.key]}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [q.key]: e.target.checked }))}
                      />
                      {q.label}
                    </label>
                  ))}
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-3.5 font-semibold text-white shadow-glow disabled:opacity-60"
                >
                  {busy ? <Loader2 size={18} className="animate-spin" /> : null}
                  Secure my early access
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
      <Footer />
    </Section>
  );
}
