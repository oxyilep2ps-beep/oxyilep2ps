'use client';

import { FormEvent, useState } from 'react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { ArrowRight, BriefcaseBusiness, FileUp, Handshake, Heart, ShieldCheck } from 'lucide-react';
import { Footer } from '@/components/footer';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

function Section({ children }: { children: React.ReactNode }) {
  return <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">{children}</section>;
}

const roles = ['Engineering', 'Compliance', 'Support', 'Product Design', 'Operations'];

export default function CareersPage() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(roles[0]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [resume, setResume] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openApply = (selectedRole: string) => {
    setRole(selectedRole);
    setOpen(true);
    setMessage(null);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!resume) {
      setError('Please attach a PDF resume (max 5MB).');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const body = new FormData();
    body.set('full_name', fullName);
    body.set('email', email);
    body.set('phone', phone);
    body.set('role_applied', role);
    body.set('resume', resume);

    const res = await fetch('/api/careers/apply', { method: 'POST', body });
    const data = (await res.json()) as { success?: boolean; error?: string };

    if (!res.ok || data.error) {
      setError(data.error ?? 'Submission failed');
    } else {
      setMessage('Application received. Our team will be in touch.');
      setFullName('');
      setEmail('');
      setPhone('');
      setResume(null);
    }
    setLoading(false);
  };

  return (
    <Section>
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-brand-500">Culture</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">Careers</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Build trust-first financial products with a team focused on quality, compliance, and a beautiful user experience.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              {
                title: 'Our values',
                icon: <Heart size={18} />,
                items: ['Trust by design', 'Clarity over complexity', 'Human support, always', 'High craftsmanship'],
              },
              {
                title: 'Perks',
                icon: <Handshake size={18} />,
                items: ['Flexible working', 'Premium equipment', 'Learning budget', 'Wellbeing support'],
              },
            ].map((box) => (
              <div key={box.title} className="glass-card rounded-[2rem] p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  {box.icon}
                </div>
                <h2 className="mt-4 text-xl font-bold text-slate-950 dark:text-white">{box.title}</h2>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {box.items.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-[2.25rem] p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Open roles</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">Join the team</h2>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
              <BriefcaseBusiness size={20} />
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {roles.map((r) => (
              <div
                key={r}
                className="rounded-[1.6rem] border border-slate-200 bg-white/80 p-5 dark:border-white/10 dark:bg-black"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-950 dark:text-white">{r}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Help shape the Oxyile P2P lending experience.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openApply(r)}
                    className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Apply <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[1.6rem] border border-brand-200 bg-brand-500/5 p-5 dark:border-brand-500/20 dark:bg-brand-500/10">
            <div className="flex items-center gap-3">
              <ShieldCheck size={18} className="text-brand-500" />
              <p className="font-semibold text-slate-950 dark:text-white">Compliance-minded environment</p>
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Work with product, compliance, and support teams to build a trusted lending platform from day one.
            </p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4 backdrop-blur-md"
          >
            <motion.form
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onSubmit={handleSubmit}
              className="glass-card w-full max-w-xl rounded-[2rem] p-7"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Application</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">Apply — {role}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-white/10"
                >
                  Close
                </button>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <input
                  required
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none dark:border-white/10 dark:bg-black"
                />
                <input
                  required
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none dark:border-white/10 dark:bg-black"
                />
                <input
                  required
                  type="tel"
                  placeholder="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none dark:border-white/10 dark:bg-black"
                />
                <label className="sm:col-span-2 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-brand-300 bg-brand-500/5 px-4 py-4 dark:border-brand-500/30">
                  <FileUp className="text-brand-500" size={22} />
                  <span className="text-sm">
                    {resume ? resume.name : 'Upload resume (PDF, max 5MB)'}
                  </span>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => setResume(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              {message && <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
              <button
                type="submit"
                disabled={loading}
                className="mt-5 w-full rounded-full bg-brand-500 px-6 py-3.5 font-semibold text-white shadow-glow disabled:opacity-60"
              >
                {loading ? 'Submitting…' : 'Submit application'}
              </button>
            </motion.form>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <Footer />
    </Section>
  );
}
