import { Hero } from '@/components/hero';
import { HowItWorks } from '@/components/how-it-works';
import { SavingsVsBank } from '@/components/savings-vs-bank';
import { TransparencyHub } from '@/components/transparency-hub';
import { LiveVerifiedProfiles } from '@/components/live-verified-profiles';
import { FeaturesGrid } from '@/components/features-grid';
import { OxyileVsTraditional } from '@/components/oxyile-vs-traditional';
import { TrustSecurity } from '@/components/trust-security';
import { Regulatory } from '@/components/regulatory';
import { SmartCalculator } from '@/components/smart-calculator';
import { ReviewsReputation } from '@/components/reviews-reputation';
import { FaqsAccordion } from '@/components/faqs-accordion';
import { OliverBotFooter } from '@/components/oliver-bot-footer';

export default function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <SavingsVsBank />
      <TransparencyHub />
      <LiveVerifiedProfiles />
      <FeaturesGrid />
      <OxyileVsTraditional />
      <TrustSecurity />
      <Regulatory />
      <SmartCalculator />
      <ReviewsReputation />
      <FaqsAccordion />
      <OliverBotFooter />
    </>
  );
}
'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  ExternalLink,
  HandCoins,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { Footer } from '@/components/footer';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </section>
  );
}

function Pill({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold ${className}`}>{children}</span>;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
  <div className="rounded-3xl border border-white/60 bg-white/75 p-5 shadow-glass backdrop-blur-xl dark:border-white/10 dark:bg-[#050505]/80">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{sub}</p>
    </div>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 shrink-0 text-brand-500" size={18} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Hero() {
  return (
    <Section className="pt-12 lg:pt-16">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="max-w-2xl">
          <Pill className="mb-6 bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            <Sparkles size={15} className="mr-2" />
            Direct lending. Real trust. Built for the UK.
          </Pill>
          <h1 className="text-5xl font-black tracking-tight text-slate-950 dark:text-white sm:text-6xl lg:text-7xl">
            Your financial friend <span className="orange-ring text-brand-500">with benefits!</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            Connect directly with verified investors and borrowers in London and Cardiff. Transparent, flexible, and fair peer-to-peer lending that puts you in control.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/waitlist" className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3.5 font-semibold text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-brand-400">
              Get Started <ArrowRight size={16} />
            </Link>
            <Link href="/waitlist" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-6 py-3.5 font-semibold text-slate-800 backdrop-blur transition hover:border-brand-200 hover:text-brand-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
              Join the Waitlist
            </Link>
            <a href="#demo" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-brand-600 dark:text-slate-200">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-500/10 text-brand-600">
                <ExternalLink size={14} />
              </span>
              Watch Demo
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Pill className="bg-white/75 text-slate-700 shadow-sm dark:bg-white/5 dark:text-slate-200">No hidden fees</Pill>
            <Pill className="bg-white/75 text-slate-700 shadow-sm dark:bg-white/5 dark:text-slate-200">Verified profiles</Pill>
            <Pill className="bg-white/75 text-slate-700 shadow-sm dark:bg-white/5 dark:text-slate-200">London & Cardiff</Pill>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" className="relative" id="demo">
          <div className="absolute -left-4 top-10 h-24 w-24 rounded-3xl bg-brand-500/10 blur-2xl" />
          <div className="absolute -right-2 top-4 h-16 w-16 rounded-2xl bg-brand-400/20 blur-xl" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="glass-card relative overflow-hidden rounded-[2rem] p-5 md:translate-y-8">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.55),rgba(255,129,74,0.06))]" />
              <div className="relative space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">London skyline</p>
                    <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">Verified capital hub</p>
                  </div>
                  <Pill className="bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">Live</Pill>
                </div>
                <div className="h-40 rounded-[1.6rem] bg-[linear-gradient(180deg,#fbe8dd,#ffd2be_52%,#f68f62)]">
                  <div className="flex h-full items-end gap-2 px-5 pb-4">
                    <div className="h-20 w-4 rounded-t-full bg-neutral-950/60" />
                    <div className="h-28 w-5 rounded-t-full bg-neutral-950/75" />
                    <div className="h-36 w-8 rounded-t-full bg-neutral-950/85" />
                    <div className="h-24 w-4 rounded-t-full bg-neutral-950/65" />
                    <div className="ml-auto h-16 w-20 rounded-t-[2rem] bg-white/55 backdrop-blur-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Investors online" value="1,248" sub="Demand meeting verified profiles" />
                  <StatCard label="Loans funded" value="£12.4M" sub="Transparent marketplace volume" />
                </div>
              </div>
            </div>
            <div className="space-y-4 md:pt-16">
              <div className="glass-card relative rounded-[2rem] p-5">
                <div className="absolute -right-2 -top-2 h-8 w-8 rounded-xl bg-brand-500/15" />
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Cardiff business district</p>
                <div className="mt-4 h-28 rounded-[1.5rem] bg-[linear-gradient(180deg,#fdf1ea,#ffd8c4)]">
                  <div className="flex h-full items-end gap-2 px-4 pb-3">
                    <div className="h-16 w-5 rounded-t-full bg-brand-700/70" />
                    <div className="h-22 w-8 rounded-t-full bg-brand-800/80" />
                    <div className="h-14 w-4 rounded-t-full bg-neutral-950/70" />
                    <div className="ml-auto h-12 w-16 rounded-t-[1.5rem] bg-white/55 backdrop-blur-xl" />
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="glass-card relative overflow-hidden rounded-[2rem] p-5">
                  <div className="absolute right-3 top-3 grid grid-cols-2 gap-1">
                    <span className="h-3 w-3 rounded-sm bg-brand-500/30" />
                    <span className="h-3 w-3 rounded-sm bg-brand-500/50" />
                    <span className="h-3 w-3 rounded-sm bg-brand-500/20" />
                    <span className="h-3 w-3 rounded-sm bg-brand-500/40" />
                  </div>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">Glassmorphism accents</p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Floating design cues keep the experience premium and airy.</p>
                </div>
                <div className="glass-card relative overflow-hidden rounded-[2rem] p-5">
                  <div className="absolute left-3 bottom-3 h-10 w-10 rounded-2xl bg-brand-500/10" />
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">Direct trust layer</p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Verified users, transparent terms, and human support.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </Section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: '1',
      title: 'Create Your Profile',
      desc: 'Sign up, verify identity, and align your profile with lending criteria or investor preferences.',
      badge: 'For Both',
      icon: <Users size={18} />,
    },
    {
      n: '2',
      title: 'Browse & Connect',
      desc: 'View verified risk levels, browse profiles, compare terms, and shortlist matches with confidence.',
      badge: 'For Both',
      icon: <Target size={18} />,
    },
    {
      n: '3',
      title: 'Negotiate & Lend',
      desc: 'Agree on rates, terms, and monthly percentages directly before funding begins.',
      badge: 'For Both',
      icon: <HandCoins size={18} />,
    },
  ];

  return (
    <Section>
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
        <h2 className="section-heading">
          How <span className="text-brand-500">Oxyile</span> Works
        </h2>
        <p className="section-subtitle">Three simple, transparent steps that connect borrowers and investors without the traditional friction.</p>
      </motion.div>
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {steps.map((step) => (
          <motion.div
            key={step.n}
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="glass-card relative overflow-hidden rounded-[2rem] p-7 transition hover:-translate-y-1"
          >
            <div className="absolute right-5 top-5 grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
              {step.icon}
            </div>
            <div className="absolute -right-4 -top-4 grid h-16 w-16 place-items-center rounded-full bg-[linear-gradient(135deg,#FF814A,#FF5A1F)] text-xl font-black text-white shadow-glow">
              {step.n}
            </div>
            <Pill className="bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">{step.badge}</Pill>
            <h3 className="mt-5 text-2xl font-bold text-slate-950 dark:text-white">{step.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{step.desc}</p>
            <div className="mt-6 h-px bg-gradient-to-r from-brand-500/40 to-transparent" />
            <p className="mt-5 text-sm font-medium text-slate-500 dark:text-slate-400">Interconnected flow for both borrower and investor journeys.</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

function Transparency() {
  const [mode, setMode] = useState<'invest' | 'borrow'>('invest');
  const borrowerChecklist = ['Verified Identity', 'Credit Score Visible', 'Loan Amount Visible', 'Purpose Shared', 'Term Clearly Stated'];
  const investorChecklist = ['Investment Portfolio', 'Track Record', '5-Star Rating', 'Available Capital', 'Preferred Rate Range'];

  return (
    <Section>
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
        <h2 className="section-heading">
          Full <span className="text-brand-500">Transparency</span>
        </h2>
        <p className="section-subtitle">Switch between audience views to see exactly what each side can preview before they commit.</p>
      </motion.div>
      <div className="mt-8 flex flex-wrap gap-3">
        <button onClick={() => setMode('invest')} className={`rounded-full px-5 py-3 text-sm font-semibold transition ${mode === 'invest' ? 'bg-brand-500 text-white shadow-glow' : 'border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'}`}>
          I want to Invest
        </button>
        <button onClick={() => setMode('borrow')} className={`rounded-full px-5 py-3 text-sm font-semibold transition ${mode === 'borrow' ? 'bg-brand-500 text-white shadow-glow' : 'border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'}`}>
          I need to Borrow
        </button>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="glass-card rounded-[2rem] p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Borrower Profiles</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">What investors can see</h3>
            </div>
            <Pill className="bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">Low risk</Pill>
          </div>
          <div className="mt-6 rounded-[1.6rem] border border-white/70 bg-white/80 p-6 dark:border-white/10 dark:bg-[#050505]/80">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xl font-bold text-slate-950 dark:text-white">Sarah M.</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">London, UK</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500 dark:text-slate-400">Credit Score</p>
                <p className="text-3xl font-black text-brand-500">745</p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <StatCard label="Loan Amount" value="£15,000" sub="Visible to verified investors" />
              <StatCard label="Risk Level" value="Low" sub="Green indicator and clear terms" />
              <StatCard label="Purpose" value="Home Improvement" sub="Directly disclosed use case" />
              <StatCard label="Term" value="24 months" sub="Monthly repayment horizon" />
            </div>
            <div className="mt-6">
              <CheckList items={borrowerChecklist} />
            </div>
          </div>
        </motion.div>
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="glass-card rounded-[2rem] p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Investor Profiles</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">What borrowers can see</h3>
            </div>
            <Pill className="bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">Featured</Pill>
          </div>
          <div className="mt-6 rounded-[1.6rem] border border-white/70 bg-white/80 p-6 dark:border-white/10 dark:bg-[#050505]/80">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xl font-bold text-slate-950 dark:text-white">John D.</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Experienced Investor</p>
              </div>
              <div className="text-right">
                <p className="flex items-center gap-1 text-sm text-amber-500"><Star size={15} fill="currentColor" /> 5-star rating</p>
                <p className="mt-1 text-3xl font-black text-brand-500">£50,000</p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <StatCard label="Preferred Rate" value="5-8%" sub="Balanced risk appetite" />
              <StatCard label="Min Term" value="12 months" sub="Flexible matching horizon" />
              <StatCard label="Success Rate" value="96%" sub="Reliable funding track record" />
              <StatCard label="Available" value="£50,000" sub="Ready to deploy capital" />
            </div>
            <div className="mt-6">
              <CheckList items={investorChecklist} />
            </div>
          </div>
        </motion.div>
      </div>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Active view: {mode === 'invest' ? 'Investor-led transparency' : 'Borrower-led transparency'}.</p>
    </Section>
  );
}

function Flexibility() {
  const cards = [
    { title: 'Negotiate Interest Rates', badge: '5-12% typical range', icon: <Banknote size={20} />, desc: 'Set terms that reflect real risk, not one-size-fits-all pricing.' },
    { title: 'Flexible Repayment', badge: 'Monthly flexibility', icon: <CreditCard size={20} />, desc: 'Structure repayments that respect cash flow and personal comfort.' },
    { title: 'Direct Communication', badge: 'Built-in messaging', icon: <MessageSquare size={20} />, desc: 'Discuss details directly before funds move in either direction.' },
    { title: 'Quick Decisions', badge: '48-hour average', icon: <Clock3 size={20} />, desc: 'Keep momentum with a streamlined review and funding workflow.' },
  ];

  return (
    <Section>
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
        <h2 className="section-heading">
          Ultimate <span className="text-brand-500">Flexibility</span>
        </h2>
      </motion.div>
      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <motion.div key={card.title} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="glass-card rounded-[2rem] p-6 transition hover:-translate-y-1 hover:shadow-glow">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">{card.icon}</div>
            <h3 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">{card.title}</h3>
            <Pill className="mt-4 bg-neutral-950 text-white dark:bg-white dark:text-neutral-950">{card.badge}</Pill>
            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{card.desc}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="glass-card rounded-[2rem] p-7">
          <h3 className="text-2xl font-bold text-slate-950 dark:text-white">Oxyile vs Traditional Lenders</h3>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-rose-200/70 bg-rose-500/5 p-5 dark:border-rose-500/20 dark:bg-rose-500/10">
              <p className="font-semibold text-rose-600 dark:text-rose-300">Traditional lenders</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                {['Weeks of waiting', 'Hidden fees', 'Rigid schedules', 'Opaque criteria'].map((item) => (
                  <li key={item} className="flex items-start gap-2"><X size={16} className="mt-0.5 text-rose-500" />{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-[1.5rem] border border-brand-200/70 bg-brand-500/5 p-5 dark:border-brand-500/20 dark:bg-brand-500/10">
              <p className="font-semibold text-brand-600 dark:text-brand-300">Oxyile</p>
    );
              <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                {['Apply in minutes', 'Custom rates', 'Zero hidden fees', 'Human support'].map((item) => (
                  <li key={item} className="flex items-start gap-2"><Check className="mt-0.5 text-brand-500" size={16} />{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="glass-card rounded-[2rem] p-7">
          <h3 className="text-2xl font-bold text-slate-950 dark:text-white">Why it feels modern</h3>
          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
            <p>Borrowers and investors communicate directly with a clean matching experience that mirrors the pace of modern finance.</p>
            <p>Every key decision stays visible so the process feels fast, personal, and trustworthy from start to finish.</p>
          </div>
        </motion.div>
      </div>
    </Section>
  );
}

function TrustSecurity() {
  const security = [
    { title: 'Bank-Level Security', desc: '256-bit SSL encryption at every step.', icon: <ShieldCheck size={20} /> },
    { title: 'Identity Verification', desc: 'KYC checks ensure trusted participation.', icon: <BadgeCheck size={20} /> },
    { title: 'Secure Transactions', desc: 'Protected payment workflows and auditability.', icon: <Banknote size={20} /> },
    { title: 'Legal Protection', desc: 'Structured terms and compliance-first operations.', icon: <ShieldCheck size={20} /> },
  ];

  const badges = ['FinTech Wales Member', 'FCA Pending', 'PCI-DSS Compliant', 'UK GDPR Compliant', 'Open Banking'];

  return (
    <Section>
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
        <h2 className="section-heading">
          Trust & <span className="text-brand-500">Security First</span>
        </h2>
      </motion.div>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="grid gap-6 sm:grid-cols-2">
          {security.map((item) => (
            <motion.div key={item.title} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="glass-card rounded-[2rem] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">{item.icon}</div>
              <h3 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{item.desc}</p>
            </motion.div>
          ))}
        </div>
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="glass-card rounded-[2rem] p-7">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">FCA authorisation application in progress</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {badges.map((badge) => (
              <Pill key={badge} className="bg-white/90 text-slate-700 dark:bg-white/5 dark:text-slate-200">{badge}</Pill>
            ))}
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-5 dark:border-white/10 dark:bg-[#050505]/80">
              <p className="text-lg font-bold text-slate-950 dark:text-white">Protected Funds</p>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">Client money is held with Tier 1 UK banks under strict segregation controls.</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-5 dark:border-white/10 dark:bg-[#050505]/80">
              <p className="text-lg font-bold text-slate-950 dark:text-white">KYC Verification</p>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">Identity and AML checks support a safer ecosystem for all participants.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </Section>
  );
}

function Calculator() {
  const [amount, setAmount] = useState(10000);
  const [rate, setRate] = useState(8);
  const [tenure, setTenure] = useState(12);

  const { emi, totalRepayment, totalInterest, investorRoi } = useMemo(() => {
    const principal = amount;
    const monthlyRate = rate / 12 / 100;
    const n = tenure;
    const emiValue = monthlyRate === 0 ? principal / n : (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
    const total = emiValue * n;
    const interest = total - principal;
    const roi = (interest / principal) * 100;
    return {
      emi: emiValue,
      totalRepayment: total,
      totalInterest: interest,
      investorRoi: roi,
    };
  }, [amount, rate, tenure]);

  return (
    <Section>
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
        <h2 className="section-heading flex items-center gap-3">
          <Sparkles className="text-brand-500" /> Smart <span className="text-brand-500">Calculator</span>
        </h2>
      </motion.div>
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="glass-card rounded-[2rem] p-7">
          <div className="space-y-8">
            <div>
              <div className="mb-3 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>Loan Amount (£1,000 to £50,000)</span>
                <span className="font-semibold text-slate-950 dark:text-white">£{amount.toLocaleString()}</span>
              </div>
              <input type="range" min={1000} max={50000} step={500} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="h-2 w-full cursor-pointer accent-brand-500" />
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>Interest Rate (3% to 15% p.a.)</span>
                <span className="font-semibold text-slate-950 dark:text-white">{rate}%</span>
              </div>
              <input type="range" min={3} max={15} step={0.1} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="h-2 w-full cursor-pointer accent-brand-500" />
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>Loan Tenure (6 to 60 months)</span>
                <span className="font-semibold text-slate-950 dark:text-white">{tenure} months</span>
              </div>
              <input type="range" min={6} max={60} step={1} value={tenure} onChange={(e) => setTenure(Number(e.target.value))} className="h-2 w-full cursor-pointer accent-brand-500" />
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="glass-card rounded-[2rem] p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Live results</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">Real-time calculations</h3>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
              <BarChart3 size={20} />
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.6rem] bg-brand-500 px-5 py-6 text-white shadow-glow sm:col-span-2">
              <p className="text-sm/6 text-white/85">Monthly EMI (Borrower)</p>
              <p className="mt-2 text-4xl font-black">£{emi.toFixed(2)}</p>
            </div>
            <StatCard label="Total Repayment" value={`£${totalRepayment.toFixed(2)}`} sub="Principal plus accrued interest" />
            <StatCard label="Total Interest" value={`£${totalInterest.toFixed(2)}`} sub="Estimated cost over tenure" />
            <StatCard label="Investor ROI" value={`${investorRoi.toFixed(2)}%`} sub="Indicative return before fees" />
            <div className="rounded-[1.6rem] border border-amber-200/70 bg-amber-500/10 p-5 dark:border-amber-500/20 dark:bg-amber-500/10 sm:col-span-2">
              <p className="font-semibold text-amber-700 dark:text-amber-300">Risk Level: Moderate</p>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">Advisory disclaimer: indicative examples only. Borrowing and investing involve risk and returns are not guaranteed.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </Section>
  );
}

function Testimonials() {
  const reviews = [
    {
      name: 'Sarah Mitchell',
      stat: '£25,000 invested',
      quote: 'Oxyile makes lending feel calm, transparent, and genuinely modern. The profile details and live terms made due diligence much easier.',
    },
    {
      name: 'James Peterson',
      stat: '£15,000 borrowed',
      quote: 'The direct communication and flexible repayment structure gave me the confidence to borrow without the usual paperwork stress.',
    },
    {
      name: 'Emily Chen',
      stat: '96% repeat funding',
      quote: 'The trust-first experience, polished interface, and visible compliance signals are exactly what I wanted from a P2P platform.',
    },
  ];

  return (
    <Section>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Illustration disclaimer: profile images and metrics are stylized placeholders for demonstration purposes.</p>
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
        <h2 className="section-heading">
          Trusted by <span className="text-brand-500">Thousands</span>
        </h2>
      </motion.div>
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {reviews.map((review, index) => (
          <motion.div key={review.name} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="glass-card relative overflow-hidden rounded-[2rem] p-7">
            <div className="absolute right-4 top-3 text-7xl font-black text-brand-500/10">“</div>
            <div className="flex items-center gap-1 text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
            </div>
            <p className="mt-5 text-sm leading-7 text-slate-600 dark:text-slate-300">{review.quote}</p>
            <div className="mt-6 flex items-end justify-between gap-4">
              <div>
                <p className="font-bold text-slate-950 dark:text-white">{review.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Verified community member</p>
              </div>
              <Pill className="bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">{review.stat}</Pill>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Transparency />
      <Flexibility />
      <TrustSecurity />
      <Calculator />
      <Testimonials />
      <Footer />
    </>
  );
}