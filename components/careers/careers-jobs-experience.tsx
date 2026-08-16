'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import {
  ArrowRight,
  BriefcaseBusiness,
  Handshake,
  Heart,
  MapPin,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Footer } from '@/components/footer';
import { listPublicOpenJobs } from '@/app/actions/public-careers';
import type { JobPosting } from '@/lib/hr/types';
import { formatJobCompensation, jobHasNumericSalary } from '@/lib/hr/types';
import { employmentTypeLabel } from '@/lib/hr/ui';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

function Section({ children }: { children: React.ReactNode }) {
  return <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">{children}</section>;
}

function salaryBand(job: JobPosting): string {
  return formatJobCompensation(job);
}

export function CareersJobsExperience() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void listPublicOpenJobs()
      .then(setJobs)
      .finally(() => setLoading(false));
  }, []);

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
                <Link
                  key={job.id}
                  href={`/careers/${job.id}`}
                  className="block w-full rounded-[1.6rem] border border-slate-200 bg-white/80 p-5 text-left transition hover:border-orange-500/50 dark:border-white/10 dark:bg-neutral-950/80 dark:hover:bg-neutral-900"
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
                        {jobHasNumericSalary(job) ? (
                          <span className="inline-flex max-w-full items-center gap-1 whitespace-normal rounded-full bg-emerald-500/15 px-2.5 py-1 text-left text-emerald-700 dark:text-emerald-400">
                            <Wallet size={12} />
                            {salaryBand(job)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-500 px-3 py-2 text-xs font-bold text-white">
                      View <ArrowRight size={14} />
                    </span>
                  </div>
                </Link>
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
      <Footer />
    </Section>
  );
}
