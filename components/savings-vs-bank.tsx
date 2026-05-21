'use client';

import { motion } from 'framer-motion';
import { formatGBP } from '@/lib/currency';

export function SavingsVsBank() {
  const bank = {
    investorYield: 3.5,
    bankSpread: 6.0,
    borrowerRate: 13.5,
  };

  const oxyile = {
    investorYield: 9.5,
    platformSpread: 0.0,
    borrowerRate: 9.5,
  };

  const sampleInvestment = 10000; // example

  return (
    <section className="py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <h2 className="section-heading">Savings vs Bank Comparator</h2>
          <p className="section-subtitle mx-auto mt-4">See the direct route vs the traditional path — gamified meters show the real difference.</p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-neutral-50 p-6 dark:bg-black dark:border-white/6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-800 dark:text-white">Traditional Bank Path</h3>
              <span className="text-sm text-neutral-500">Slow · Hidden fees</span>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Investor Yield</p>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">{bank.investorYield}%</p>
                </div>
                <div className="mt-2 h-3 w-full rounded-full bg-white/60 dark:bg-transparent">
                  <motion.div className="h-3 rounded-full bg-gradient-to-r from-gray-400 to-red-500" initial={{ width: 0 }} animate={{ width: `${bank.investorYield * 6}%` }} transition={{ duration: 1.6 }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Bank Spread</p>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">{bank.bankSpread}%</p>
                </div>
                <div className="mt-2 h-3 w-full rounded-full bg-white/60 dark:bg-transparent">
                  <motion.div className="h-3 rounded-full bg-gradient-to-r from-red-400 to-red-600" initial={{ width: 0 }} animate={{ width: `${bank.bankSpread * 6}%` }} transition={{ duration: 1.6, delay: 0.1 }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Borrower Rate</p>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">{bank.borrowerRate}%</p>
                </div>
                <div className="mt-2 h-3 w-full rounded-full bg-white/60 dark:bg-transparent">
                  <motion.div className="h-3 rounded-full bg-gradient-to-r from-gray-600 to-red-700" initial={{ width: 0 }} animate={{ width: `${bank.borrowerRate * 6}%` }} transition={{ duration: 1.6, delay: 0.2 }} />
                </div>
              </div>

              <div className="mt-4 border-t border-white/6 pt-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-300">Example: Investor capital</p>
                <p className="mt-1 text-xl font-extrabold text-neutral-900 dark:text-white">{formatGBP(sampleInvestment)} → {formatGBP(sampleInvestment * (1 + bank.investorYield / 100))} (approx)</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white p-6 dark:bg-black dark:border-white/6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">The Oxyile Direct Path</h3>
              <span className="text-sm font-medium text-amber-500">Fast · Transparent</span>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Investor Yield</p>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">{oxyile.investorYield}%</p>
                </div>
                <div className="mt-2 h-3 w-full rounded-full bg-white/60 dark:bg-transparent">
                  <motion.div className="h-3 rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF814A]" initial={{ width: 0 }} animate={{ width: `${oxyile.investorYield * 6}%` }} transition={{ duration: 1.6 }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Platform Spread</p>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">{oxyile.platformSpread}%</p>
                </div>
                <div className="mt-2 h-3 w-full rounded-full bg-white/60 dark:bg-transparent">
                  <motion.div className="h-3 rounded-full bg-white/20" initial={{ width: 0 }} animate={{ width: `${oxyile.platformSpread * 6}%` }} transition={{ duration: 1.6, delay: 0.1 }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Borrower Rate</p>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">{oxyile.borrowerRate}%</p>
                </div>
                <div className="mt-2 h-3 w-full rounded-full bg-white/60 dark:bg-transparent">
                  <motion.div className="h-3 rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF814A]" initial={{ width: 0 }} animate={{ width: `${oxyile.borrowerRate * 6}%` }} transition={{ duration: 1.6, delay: 0.2 }} />
                </div>
              </div>

              <div className="mt-4 border-t border-white/6 pt-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-300">Example: Investor capital</p>
                <p className="mt-1 text-xl font-extrabold text-neutral-900 dark:text-white">{formatGBP(sampleInvestment)} → {formatGBP(sampleInvestment * (1 + oxyile.investorYield / 100))} (approx)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center">
          <div className="rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF814A] px-4 py-2 text-white shadow-glow">Investors typically earn ~9–10% on Oxyile</div>
        </div>
      </div>
    </section>
  );
}

export default SavingsVsBank;
