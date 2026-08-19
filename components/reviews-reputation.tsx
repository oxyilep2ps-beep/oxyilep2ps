'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, Sparkles, Users } from 'lucide-react';

const platformGoals = [
  {
    icon: ShieldCheck,
    title: 'Transparent by design',
    text: 'Every handshake will show principal, rate, tenure, and repayment schedule before either party commits.',
  },
  {
    icon: Users,
    title: 'Direct peer matching',
    text: 'We are building a UK platform where verified borrowers and investors connect without unnecessary bank spread.',
  },
  {
    icon: Sparkles,
    title: 'Asset-backed focus',
    text: 'Collateral, guarantor options, and smart-contract audit trails are core to how Oxyile is being engineered.',
  },
  {
    icon: ShieldCheck,
    title: 'Regulatory-first roadmap',
    text: 'FCA authorisation application in progress. Public launch features will follow approved financial promotion rules.',
  },
] as const;

export function ReviewsReputation() {
  return (
    <section id="reviews" className="py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <h2 className="section-heading">Why Choose Oxyile</h2>
          <p className="section-subtitle mx-auto mt-4">
            Our platform goals while we prepare for launch — no customer reviews are displayed until we are live.
          </p>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {platformGoals.map((goal) => {
            const Icon = goal.icon;
            return (
              <motion.article
                key={goal.title}
                whileHover={{ y: -6 }}
                className="rounded-2xl border border-white/6 bg-white p-5 dark:border-white/6 dark:bg-black"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#F97316]/10 text-[#F97316]">
                  <Icon size={18} />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-neutral-900 dark:text-white">{goal.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{goal.text}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default ReviewsReputation;
