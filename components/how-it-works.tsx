'use client';

import { motion } from 'framer-motion';

const steps = [
  {
    title: 'Digital KYC Setup',
    desc: 'Fast automated identity check for verified onboarding.',
  },
  {
    title: 'The Bank Bypass',
    desc: 'Remove hidden spreads — route returns directly to users.',
  },
  {
    title: 'Set Terms',
    desc: 'Tailor lending and borrowing criteria instantly.',
  },
  {
    title: 'Algorithmic Match',
    desc: 'Instant matches within London & Cardiff communities.',
  },
  {
    title: 'Smart Contract Signature',
    desc: 'Legally binding digital contract between peers.',
  },
  {
    title: 'Auto-Funding & Payouts',
    desc: 'Secure direct transfers and scheduled payouts.',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <h2 className="section-heading">How Oxyile Works</h2>
          <p className="section-subtitle mx-auto mt-4">A gamified 6-step flow connecting verified investors and borrowers through smart contracts and instant matching.</p>
        </div>

        <div className="mt-12 overflow-x-auto">
          <div className="flex items-center gap-6 px-4 py-8">
            {steps.map((s, i) => (
              <div key={s.title} className="relative flex items-center gap-6">
                <motion.div
                  className="glass-card w-64 min-w-[16rem] rounded-2xl p-5"
                  initial={{ y: 0 }}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3 + (i % 3) * 0.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-tr from-[#FF5A1F] to-[#FF814A] text-white font-bold">{i + 1}</div>
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">{s.title}</h3>
                      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">{s.desc}</p>
                    </div>
                  </div>
                </motion.div>

                {i < steps.length - 1 && (
                  <div className="relative flex h-6 w-32 items-center">
                    <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-white/10 dark:bg-transparent" />
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 bg-gradient-to-r from-[#FF5A1F] to-[#FF814A] h-0.5 bg-[length:200%_100%] animate-flow" />
                    <motion.div
                      className="absolute left-0 top-0 h-3 w-3 -translate-y-1/2 rounded-full bg-[#FF814A] shadow-[0_4px_18px_rgba(255,129,74,0.28)]"
                      animate={{ x: [0, 120] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'linear', repeatType: 'loop', delay: i * 0.2 }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <style jsx>{`
          .animate-flow { background-size: 200% 100%; animation: flowBG 3s linear infinite; }
          @keyframes flowBG { 0% { background-position: 0% 0%; } 100% { background-position: -100% 0%; } }
        `}</style>
      </div>
    </section>
  );
}

export default HowItWorks;
