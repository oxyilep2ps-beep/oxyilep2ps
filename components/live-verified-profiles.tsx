'use client';

import { motion } from 'framer-motion';
import { Building2, Clock, ShieldCheck, Users } from 'lucide-react';

const previewCards = [
  {
    icon: Users,
    title: 'Investor onboarding',
    text: 'KYC, affordability checks, and portfolio tools — launching after authorisation.',
  },
  {
    icon: Building2,
    title: 'Borrower applications',
    text: 'Collateral-backed loan requests with transparent repayment schedules.',
  },
  {
    icon: ShieldCheck,
    title: 'Verification pipeline',
    text: 'Manual compliance review for every profile before marketplace access.',
  },
  {
    icon: Clock,
    title: 'Coming soon',
    text: 'Live verified profiles will appear here once the platform is publicly available.',
  },
] as const;

export function LiveVerifiedProfiles() {
  return (
    <section id="profiles" className="py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div>
          <h2 className="section-heading">Platform Preview</h2>
          <p className="section-subtitle mt-4 max-w-2xl">
            We are not displaying live user profiles or loan volumes before launch. Below is a preview of what verified
            marketplace participants will see once Oxyile goes live.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {previewCards.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                whileHover={{ y: -6 }}
                className="rounded-2xl border border-white/10 bg-white p-5 dark:border-white/6 dark:bg-black"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#F97316]/10 text-[#F97316]">
                  <Icon size={18} />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-neutral-900 dark:text-white">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{card.text}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default LiveVerifiedProfiles;
