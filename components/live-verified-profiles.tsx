'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import formatGBP from '@/lib/currency';

const profiles = [
  { id: 1, name: 'Sarah M.', role: 'Borrower', city: 'Cardiff', amount: 15000, credit: 'A+', verified: true, rating: 4.9 },
  { id: 2, name: 'John D.', role: 'Investor', city: 'London', amount: 50000, credit: 'Pool', verified: true, rating: 4.8 },
  { id: 3, name: 'H. Patel', role: 'Borrower', city: 'London', amount: 8000, credit: 'B', verified: true, rating: 4.7 },
  { id: 4, name: 'Investor Pool B', role: 'Investor', city: 'Cardiff', amount: 120000, credit: 'Diversified', verified: true, rating: 4.85 },
  { id: 5, name: 'M. Evans', role: 'Borrower', city: 'Cardiff', amount: 22000, credit: 'A', verified: true, rating: 4.92 },
  { id: 6, name: 'L. Brown', role: 'Investor', city: 'London', amount: 30000, credit: 'Individual', verified: true, rating: 4.75 },
];

export function LiveVerifiedProfiles() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  function scrollBy(offset: number) {
    if (!containerRef.current) return;
    containerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  }

  return (
    <section id="profiles" className="py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="section-heading">Live Verified Profiles</h2>
            <p className="section-subtitle mt-4">Active borrowers and investor pools — verified badges, credit tiers, and recent success metrics.</p>
          </div>

          <div className="flex gap-2">
            <button aria-label="scroll left" onClick={() => scrollBy(-320)} className="rounded-full bg-white/70 p-2 shadow-sm dark:bg-black">
              ‹
            </button>
            <button aria-label="scroll right" onClick={() => scrollBy(320)} className="rounded-full bg-white/70 p-2 shadow-sm dark:bg-black">
              ›
            </button>
          </div>
        </div>

        <div ref={containerRef} className="mt-6 flex gap-4 overflow-x-auto pb-4 pt-2">
          {profiles.map((p) => (
            <motion.div key={p.id} whileHover={{ y: -6 }} className="min-w-[18rem] max-w-sm rounded-2xl border border-white/10 bg-white p-4 dark:bg-black dark:border-white/6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#FF5A1F] to-[#FF814A] text-white grid place-items-center font-bold">{p.name.split(' ')[0][0]}</div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">{p.name}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-300">{p.role} · {p.city}</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Verified</span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-300">Rating {p.rating}/5</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs text-neutral-600 dark:text-neutral-300">Requested / Pooled</p>
                <p className="mt-1 text-lg font-extrabold text-neutral-900 dark:text-white">{formatGBP(p.amount)}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-300">
                  <div>Credit Tier</div>
                  <div className="font-semibold">{p.credit}</div>
                </div>
                <div className="mt-3 h-2 w-full rounded-full bg-white/60 dark:bg-transparent">
                  <motion.div className="h-2 rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF814A]" initial={{ width: 0 }} animate={{ width: `${Math.min((p.amount / 50000) * 100, 100)}%` }} transition={{ duration: 1.2 }} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default LiveVerifiedProfiles;
