'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const reviews = [
  { name: 'Amelia R.', city: 'Cardiff', quote: 'Oxyile funded our small expansion within 24 hours — seamless and fair.', volume: '£25,000', rating: 5 },
  { name: 'Oliver K.', city: 'London', quote: 'Investor returns were clear and predictable — excellent platform UX.', volume: '£50,000', rating: 5 },
  { name: 'Hannah S.', city: 'Cardiff', quote: 'No hidden fees, and support helped structure our repayment plan.', volume: '£12,500', rating: 5 },
  { name: 'Priya D.', city: 'London', quote: 'Transparent process and great communication — recommended for SMEs.', volume: '£18,000', rating: 5 },
  { name: 'Ethan M.', city: 'Cardiff', quote: 'Secondary market allowed me to rebalance quickly with low fees.', volume: '£8,200', rating: 5 },
  { name: 'Sophie L.', city: 'London', quote: 'Verified lenders were helpful and offered competitive rates.', volume: '£32,000', rating: 5 },
  { name: 'Marcus T.', city: 'Cardiff', quote: 'Smart contracts made payouts fast and reliable.', volume: '£6,500', rating: 5 },
  { name: 'Liam B.', city: 'London', quote: 'Smooth KYC and great onboarding experience.', volume: '£20,000', rating: 5 },
];

export function ReviewsReputation() {
  return (
    <section id="reviews" className="py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <h2 className="section-heading">Reviews & Reputation</h2>
          <p className="section-subtitle mx-auto mt-4">Rated 4.9/5 based on verified platform exits.</p>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {reviews.map((r) => (
            <motion.blockquote key={r.name} whileHover={{ y: -6 }} className="rounded-2xl border border-white/6 bg-white p-4 dark:bg-black dark:border-white/6">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#FF5A1F] to-[#FF814A] text-white grid place-items-center font-semibold">{r.name.split(' ')[0][0]}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">{r.name}</p>
                    <span className="text-xs text-neutral-500 dark:text-neutral-300">{r.city}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={`${
                          i < r.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-neutral-300 dark:text-neutral-600'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">“{r.quote}”</p>
                </div>
              </div>

              <footer className="mt-4 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                <span>Verified loan volume</span>
                <strong>{r.volume}</strong>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ReviewsReputation;
