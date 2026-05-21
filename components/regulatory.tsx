'use client';

import { motion } from 'framer-motion';

export function Regulatory() {
  return (
    <section id="regulatory" className="py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <h2 className="section-heading">Regulatory Compliance & Accreditations</h2>
          <p className="section-subtitle mx-auto mt-4">FCA authorisation application in progress. Committed to all strict UK financial standards.</p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <motion.div className="col-span-full rounded-3xl p-6" initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-[0_8px_40px_rgba(255,90,31,0.12)] dark:bg-black">
              <div className="flex items-start gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gradient-to-tr from-[#FF5A1F] to-[#FF814A] text-white font-bold text-lg">SEIS</div>
                <div>
                  <h3 className="text-2xl font-extrabold text-[#FF5A1F]">SEIS Eligible Company</h3>
                  <p className="mt-1 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Claim Up To 50% UK Income Tax Relief</p>

                  <p className="mt-4 text-sm text-neutral-700 dark:text-neutral-300">Oxyile is officially eligible under the UK Government&apos;s Seed Enterprise Investment Scheme (SEIS). Angel investors and venture builders can claim up to 50% upfront income tax relief on platform equity investments, alongside significant Capital Gains Tax (CGT) exemptions. Fuel high-growth UK lending infrastructure while optimizing your tax efficiency. Capital at risk.</p>

                  <div className="mt-4">
                    <a href="https://www.gov.uk/guidance/seed-enterprise-investment-scheme-background" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-[#FF5A1F] hover:underline">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#FF5A1F"/>
                      </svg>
                      Learn more about official GOV.UK SEIS benefits
                    </a>
                  </div>
                </div>

                <div className="ml-auto hidden md:block">
                  <div className="rounded-full bg-white/6 p-4 dark:bg-transparent">
                    <svg width="84" height="84" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="2" width="60" height="60" rx="10" fill="#0f1724" fillOpacity="0.02" />
                      <path d="M32 10 L38 26 L54 26 L40 36 L46 52 L32 42 L18 52 L24 36 L10 26 L26 26 Z" fill="url(#g)" />
                      <defs>
                        <linearGradient id="g" x1="0" x2="1">
                          <stop offset="0%" stopColor="#FF814A" />
                          <stop offset="100%" stopColor="#FF5A1F" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          <motion.a
            href="https://fintechwales.org/members/oxyile/"
            target="_blank"
            rel="noreferrer"
            className="glass-card flex items-center gap-4 rounded-2xl p-4 hover:scale-102"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-tr from-[#FF5A1F] to-[#FF814A] text-white font-bold">FW</div>
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">FinTech Wales Member</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-300">Official member listing (external)</p>
            </div>
          </motion.a>

          <motion.div whileHover={{ y: -6 }} className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-900 text-white font-bold">PCI</div>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">PCI-DSS Compliant</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-300">Cardholder data standards for secure payments</p>
              </div>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -6 }} className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-700 text-white font-bold">GDPR</div>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">UK GDPR Data Vault Compliant</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-300">Data residency and strict access controls</p>
              </div>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -6 }} className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-600 text-white font-bold">ICO</div>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">ICO Registered Data Controller</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-300">Registered with the Information Commission&apos;s Office</p>
              </div>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -6 }} className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-tr from-[#FF5A1F] to-[#FF814A] text-white font-bold">SEIS</div>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">SEIS Eligible Company</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-300">Potential tax reliefs for eligible investors (up to 50%)</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-8 rounded-lg border border-white/6 bg-neutral-50 p-4 dark:bg-black dark:border-white/6">
          <p className="text-sm font-semibold">FCA Status</p>
          <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">Oxyile is currently applying for FCA authorisation. We remain committed to meeting the highest regulatory standards and will publish updates when authorisation is granted.</p>
        </div>
      </div>
    </section>
  );
}

export default Regulatory;
