'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { formatGBP } from '@/lib/currency';

const sampleProfiles = [
  { id: 'P-1', name: 'Borrower • South Wales', creditScore: 720, risk: 'Low', loans: 3, collateral: 12000 },
  { id: 'P-2', name: 'SME • London', creditScore: 650, risk: 'Medium', loans: 5, collateral: 8000 },
  { id: 'P-3', name: 'Investor Pool A', creditScore: null, risk: 'Diversified', loans: 28, collateral: 0 },
];

export function TransparencyHub() {
  const [view, setView] = useState<'credit' | 'risk' | 'transactions' | 'collateral'>('credit');

  return (
    <section id="transparency" className="py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <h2 className="section-heading">Full Transparency Hub</h2>
          <p className="section-subtitle mx-auto mt-4">Toggle live data visibility models to inspect anonymized credit scoring, risk tiers, recent transactions, and collateral metrics.</p>
        </div>

        <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex w-full flex-wrap items-center justify-center gap-2 px-4">
            <button
              onClick={() => setView('credit')}
              className={`rounded-full px-4 py-2 text-sm font-medium ${view === 'credit' ? 'bg-gradient-to-r from-[#FF5A1F] to-[#FF814A] text-white' : 'bg-white/70 text-neutral-700 dark:bg-black dark:text-neutral-200'}`}>
              Credit Scoring
            </button>
            <button
              onClick={() => setView('risk')}
              className={`rounded-full px-4 py-2 text-sm font-medium ${view === 'risk' ? 'bg-gradient-to-r from-[#FF5A1F] to-[#FF814A] text-white' : 'bg-white/70 text-neutral-700 dark:bg-black dark:text-neutral-200'}`}>
              Risk Classifications
            </button>
            <button
              onClick={() => setView('transactions')}
              className={`rounded-full px-4 py-2 text-sm font-medium ${view === 'transactions' ? 'bg-gradient-to-r from-[#FF5A1F] to-[#FF814A] text-white' : 'bg-white/70 text-neutral-700 dark:bg-black dark:text-neutral-200'}`}>
              Transactions
            </button>
            <button
              onClick={() => setView('collateral')}
              className={`rounded-full px-4 py-2 text-sm font-medium ${view === 'collateral' ? 'bg-gradient-to-r from-[#FF5A1F] to-[#FF814A] text-white' : 'bg-white/70 text-neutral-700 dark:bg-black dark:text-neutral-200'}`}>
              Collateral Metrics
            </button>
          </div>

          <div className="mt-4 text-center text-sm text-neutral-500 dark:text-neutral-300 md:mt-0 md:text-right">Live, anonymized feed · last updated: 2 minutes ago</div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {sampleProfiles.map((p) => (
            <motion.div key={p.id} className="glass-card p-4" whileHover={{ y: -6 }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">{p.name}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-300">{p.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">{p.risk}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-300">Tier</p>
                </div>
              </div>

              <div className="mt-4">
                {view === 'credit' && (
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-neutral-600 dark:text-neutral-300">Credit Score (anonymized)</p>
                      <p className="text-sm font-semibold">{p.creditScore ? p.creditScore : '—'}</p>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-white/60 dark:bg-transparent">
                      <motion.div className="h-2 rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF814A]" initial={{ width: 0 }} animate={{ width: p.creditScore ? `${(p.creditScore / 900) * 100}%` : '10%' }} transition={{ duration: 1.5 }} />
                    </div>
                  </div>
                )}

                {view === 'risk' && (
                  <div className="mt-2">
                    <p className="text-xs text-neutral-600 dark:text-neutral-300">Risk Profile</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`inline-block h-3 w-3 rounded-full ${p.risk === 'Low' ? 'bg-green-400' : p.risk === 'Medium' ? 'bg-yellow-400' : 'bg-gray-400'}`} />
                      <p className="text-sm font-medium">{p.risk}</p>
                    </div>
                  </div>
                )}

                {view === 'transactions' && (
                  <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-300">
                    <p>Recent anonymized transactions:</p>
                    <ul className="mt-2 list-inside list-disc">
                      <li>Payment received · {formatGBP(1200)} · 3 days ago</li>
                      <li>Partial payout · {formatGBP(450)} · 12 days ago</li>
                      <li>Scheduled debit · {formatGBP(300)} · in 5 days</li>
                    </ul>
                  </div>
                )}

                {view === 'collateral' && (
                  <div className="mt-2">
                    <p className="text-xs text-neutral-600 dark:text-neutral-300">Collateral Value</p>
                    <p className="mt-1 text-sm font-semibold">{formatGBP(p.collateral)}</p>
                    <div className="mt-2 h-2 w-full rounded-full bg-white/60 dark:bg-transparent">
                      <motion.div className="h-2 rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF814A]" initial={{ width: 0 }} animate={{ width: `${Math.min(p.collateral / 200, 100)}%` }} transition={{ duration: 1.2 }} />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TransparencyHub;
