'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import {
  ArrowRight,
  BriefcaseBusiness,
  FileUp,
  Handshake,
  Heart,
  MapPin,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';
import { Footer } from '@/components/footer';
import { listPublicOpenJobs } from '@/app/actions/public-careers';
import type { JobPosting } from '@/lib/hr/types';
import { formatGbp } from '@/lib/hr/types';
import { employmentTypeLabel } from '@/lib/hr/ui';
import { cn } from '@/lib/utils';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

function Section({ children }: { children: React.ReactNode }) {
  return <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">{children}</section>;
}

function salaryBand(job: JobPosting): string {
  if (job.salary_range_gbp) return job.salary_range_gbp;
  if (job.salary_min_gbp != null || job.salary_max_gbp != null) {
    const a = job.salary_min_gbp != null ? formatGbp(job.salary_min_gbp) : '—';
    const b = job.salary_max_gbp != null ? formatGbp(job.salary_max_gbp) : '—';
    return `${a} – ${b}`;
  }
  return 'Competitive (£ GBP)';
}

export function CareersJobsExperience() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<JobPosting | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [resume, setResume] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listPublicOpenJobs()
      .then(setJobs)
      .finally(() => setLoading(false));
  }, []);

  const openDetail = (job: JobPosting) => {
    setSelected(job);
    setApplyOpen(false);
    setMessage(null);
    setError(null);
  };

  const startApply = () => {
    setApplyOpen(true);
    setMessage(null);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    if (!resume) {
      setError('Please attach a PDF resume (max 5MB).');
      return;
    }
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const body = new FormData();
    body.set('full_name', fullName);
    body.set('email', email);
    body.set('phone', phone);
    body.set('linkedin', linkedin);
    body.set('job_id', selected.id);
    body.set('role_applied', selected.title);
    body.set('resume', resume);

    const res = await fetch('/api/careers/apply', { method: 'POST', body });
    const data = (await res.json()) as { success?: boolean; error?: string };

    if (!res.ok || data.error) {
      setError(data.error ?? 'Submission failed');
    } else {
      setMessage('Application received — it now appears on the Oxyile ATS board for HR review.');
      setFullName('');
      setEmail('');
      setPhone('');
      setLinkedin('');
      setResume(null);
    }
    setSubmitting(false);
  };

  return (
    <Section>
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="grid gap-8 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-brand-500">Culture</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">Careers</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Build trust-first financial products with a team focused on quality, UK compliance, and craft. Open roles
            sync live from Oxyile HR Studio — compensation shown in £ GBP.
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
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-orange-400">
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
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Open roles</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">Join the team</h2>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/10 text-brand-600 dark:bg-orange-500/15 dark:text-orange-400">
              <BriefcaseBusiness size={20} />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-[1.6rem] border border-white/5 bg-neutral-800/40" />
              ))
            ) : jobs.length === 0 ? (
              <div className="rounded-[1.6rem] border border-white/10 bg-neutral-950/40 p-6 text-sm text-neutral-400">
                No open roles right now. Check back soon — new postings appear here automatically when HR publishes
                them from ATS.
              </div>
            ) : (
              jobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => openDetail(job)}
                  className="w-full rounded-[1.6rem] border border-slate-200 bg-white/80 p-5 text-left transition hover:border-orange-500/50 dark:border-white/10 dark:bg-neutral-950/80 dark:hover:bg-neutral-900"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-slate-950 dark:text-white">{job.title}</p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">{job.department}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-1 text-orange-600 dark:text-orange-400">
                          <BriefcaseBusiness size={12} />
                          {employmentTypeLabel(job.employment_type)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-500/15 px-2.5 py-1 text-neutral-600 dark:text-neutral-300">
                          <MapPin size={12} />
                          {job.location || 'UK'}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-700 dark:text-emerald-400">
                          <Wallet size={12} />
                          {salaryBand(job)}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-500 px-3 py-2 text-xs font-bold text-white">
                      View <ArrowRight size={14} />
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="mt-6 rounded-[1.6rem] border border-brand-200 bg-brand-500/5 p-5 dark:border-orange-500/20 dark:bg-orange-500/10">
            <div className="flex items-center gap-3">
              <ShieldCheck size={18} className="text-brand-500 dark:text-orange-400" />
              <p className="font-semibold text-slate-950 dark:text-white">Compliance-minded environment</p>
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Work with product, compliance, and support teams to build a trusted UK FinTech lending platform.
            </p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {selected ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-0 backdrop-blur-md sm:items-center sm:p-4"
            onClick={() => {
              setSelected(null);
              setApplyOpen(false);
            }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[2rem] border border-white/10 bg-neutral-950/95 sm:rounded-[2rem]"
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-400">Role details</p>
                  <h3 className="mt-2 text-2xl font-black text-white">{selected.title}</h3>
                  <p className="mt-1 text-sm text-neutral-400">
                    {selected.department} · {employmentTypeLabel(selected.employment_type)} ·{' '}
                    {selected.location || 'UK'}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => {
                    setSelected(null);
                    setApplyOpen(false);
                  }}
                  className="rounded-full border border-white/10 p-2 text-neutral-300 hover:bg-orange-500/20"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5 text-sm leading-7 text-neutral-300">
                <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 font-semibold text-orange-300">
                  Compensation: {salaryBand(selected)}
                </div>

                <Block title="Description">{selected.description || 'Join Oxyile to ship compliant, customer-obsessed FinTech.'}</Block>
                <Block title="Key responsibilities & UK / FCA compliance">
                  {selected.responsibilities ||
                    'Uphold FCA-aligned conduct, data protection, and customer safeguarding standards.'}
                </Block>
                <Block title="Requirements">{selected.requirements}</Block>

                {!applyOpen ? (
                  <button
                    type="button"
                    onClick={startApply}
                    className="w-full rounded-full bg-orange-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600"
                  >
                    Apply Now
                  </button>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-white/10 bg-neutral-900/80 p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-orange-400">Application</p>
                    <input
                      required
                      placeholder="Full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-neutral-100 placeholder:text-neutral-500 focus:border-orange-500 focus:outline-none"
                    />
                    <input
                      required
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-neutral-100 placeholder:text-neutral-500 focus:border-orange-500 focus:outline-none"
                    />
                    <input
                      type="tel"
                      placeholder="Phone (optional)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-neutral-100 placeholder:text-neutral-500 focus:border-orange-500 focus:outline-none"
                    />
                    <input
                      type="url"
                      placeholder="LinkedIn profile URL"
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-neutral-100 placeholder:text-neutral-500 focus:border-orange-500 focus:outline-none"
                    />
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-orange-500/40 bg-orange-500/5 px-4 py-4">
                      <FileUp className="text-orange-400" size={22} />
                      <span className="text-sm text-neutral-200">
                        {resume ? resume.name : 'Upload resume (PDF, max 5MB)'}
                      </span>
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => setResume(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    {error ? <p className="text-sm text-red-400">{error}</p> : null}
                    {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-full bg-orange-500 py-3.5 font-bold text-white disabled:opacity-60"
                    >
                      {submitting ? 'Submitting…' : 'Submit application'}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <Footer />
    </Section>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wider text-orange-400">{title}</p>
      <div className={cn('mt-2 whitespace-pre-wrap rounded-2xl border border-white/5 bg-neutral-900/50 px-4 py-3')}>
        {children}
      </div>
    </div>
  );
}
