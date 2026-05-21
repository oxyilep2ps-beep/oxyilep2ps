'use client';

import { useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { CheckCircle2, Mail, MapPin, ShieldCheck, Sparkles, Users } from 'lucide-react';
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

export default function WaitlistPage() {
  const [submitted, setSubmitted] = useState(false);
  const [type, setType] = useState('Borrower');
  const [location, setLocation] = useState('London');

  return (
    <Section>
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-6">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-500">Early access</p>
          <h1 className="text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">Join the Waitlist</h1>
          <p className="max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">Capture your lending goals and be first in line when Oxyile opens doors for verified borrowers and investors.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: <Users size={18} />, title: 'Borrower / Investor toggle', text: 'Tailored onboarding based on your role.' },
              { icon: <ShieldCheck size={18} />, title: 'Verified access', text: 'Compliance-first onboarding experience.' },
              { icon: <MapPin size={18} />, title: 'London & Cardiff', text: 'City-specific launch readiness.' },
              { icon: <Sparkles size={18} />, title: 'Delightful success state', text: 'Confetti and spark feedback on submit.' },
            ].map((item) => (
              <div key={item.title} className="glass-card rounded-[1.8rem] p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">{item.icon}</div>
                <p className="mt-4 font-semibold text-slate-950 dark:text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.text}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" className="glass-card relative overflow-hidden rounded-[2.25rem] p-7">
          <AnimatePresence>{submitted ? <ConfettiBurst /> : null}</AnimatePresence>
          <div className="relative">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Be first</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">High-converting waitlist capture</h2>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                <Sparkles size={20} />
              </div>
            </div>

            {submitted ? (
              <div className="mt-8 rounded-[1.8rem] border border-brand-200 bg-brand-500/5 p-7 text-center dark:border-brand-500/20 dark:bg-brand-500/10">
                <CheckCircle2 className="mx-auto text-brand-500" size={34} />
                <h3 className="mt-4 text-2xl font-bold text-slate-950 dark:text-white">You’re on the list</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">Thanks for joining Oxyile. We’ll reach out as soon as your city and account type are ready.</p>
              </div>
            ) : (
              <form
                className="mt-7 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSubmitted(true);
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">User type</span>
                    <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none dark:border-white/10 dark:bg-black">
                      <option>Borrower</option>
                      <option>Investor</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Target capital</span>
                    <input type="text" placeholder="£10,000" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none placeholder:text-slate-400 dark:border-white/10 dark:bg-black" />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-black">
                    <Mail size={18} className="text-slate-400" />
                    <input type="email" placeholder="you@example.com" className="w-full bg-transparent outline-none placeholder:text-slate-400" />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Location</span>
                  <select value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none dark:border-white/10 dark:bg-black">
                    <option>London</option>
                    <option>Cardiff</option>
                  </select>
                </label>
                <button className="w-full rounded-full bg-brand-500 px-6 py-3.5 font-semibold text-white shadow-glow transition hover:bg-brand-400">Secure my early access</button>
                <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">Selected type: {type}. Selected city: {location}. We’ll use this to tailor your launch experience.</p>
              </form>
            )}
          </div>
        </motion.div>
      </div>
      <Footer />
    </Section>
  );
}