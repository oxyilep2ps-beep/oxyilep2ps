'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { formatGBP } from '@/lib/currency';

function monthlyPayment(principal: number, annualRate: number, months: number) {
  if (annualRate <= 0) return principal / months;
  const r = annualRate / 100 / 12;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export function SmartCalculator() {
  const [amount, setAmount] = useState(15000);
  const [rate, setRate] = useState(9.5);
  const [months, setMonths] = useState(36);

  const bankRate = 13.5; // comparator

  const emi = useMemo(() => monthlyPayment(amount, rate, months), [amount, rate, months]);
  const totalRepayment = useMemo(() => emi * months, [emi, months]);
  const totalInterest = useMemo(() => totalRepayment - amount, [totalRepayment, amount]);

  const bankEmi = useMemo(() => monthlyPayment(amount, bankRate, months), [amount, months]);
  const bankTotal = useMemo(() => bankEmi * months, [bankEmi, months]);
  const savedVsBank = Math.max(0, bankTotal - totalRepayment);

  const investorROIpercent = useMemo(() => {
    // simple annualized ROI estimate from total interest
    const totalInterestPct = totalInterest / amount;
    const annualized = (totalInterestPct * (12 / months)) * 100;
    return annualized;
  }, [totalInterest, amount, months]);

  return (
    <section id="calculator" className="py-16">
      <div className="mx-auto max-w-4xl px-4">
        <div className="text-center">
          <h2 className="section-heading">Dynamic Smart Calculator</h2>
          <p className="section-subtitle mx-auto mt-4">Adjust sliders to preview monthly payments, total repayment and estimated investor ROI (all values shown in £).</p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white p-6 dark:bg-black dark:border-white/6">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Loan Amount (£1,000 - £50,000)</label>
                <input type="range" min={1000} max={50000} step={500} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full" />
                <div className="mt-2 text-lg font-bold">{formatGBP(amount)}</div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Interest Rate (3% - 15%)</label>
                <input type="range" min={3} max={15} step={0.1} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-full" />
                <div className="mt-2 text-lg font-bold">{rate.toFixed(2)}%</div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Loan Tenure (6 - 60 months)</label>
                <input type="range" min={6} max={60} step={1} value={months} onChange={(e) => setMonths(Number(e.target.value))} className="w-full" />
                <div className="mt-2 text-lg font-bold">{months} months</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white p-6 dark:bg-black dark:border-white/6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-300">Monthly EMI</p>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 text-3xl font-extrabold text-neutral-900 dark:text-white">
                  {formatGBP(Math.max(0, emi))}
                </motion.p>
              </div>

              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-300">Total Repayment</p>
                <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-white">{formatGBP(totalRepayment)}</p>
              </div>

              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-300">Total Interest</p>
                <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-white">{formatGBP(totalInterest)}</p>
              </div>

              <div className="mt-2 border-t border-white/6 pt-4">
                <p className="text-sm text-neutral-500 dark:text-neutral-300">Saved vs Typical Bank (≈{bankRate}%)</p>
                <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-white">{formatGBP(savedVsBank)}</p>
              </div>

              <div className="mt-2">
                <p className="text-sm text-neutral-500 dark:text-neutral-300">Estimated Investor ROI (annualised)</p>
                <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-white">{investorROIpercent.toFixed(2)}%</p>
              </div>

              <div className="mt-4">
                <a href="#profiles" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF814A] px-4 py-2 text-sm font-semibold text-white shadow-glow">
                  Compare Investors
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SmartCalculator;
