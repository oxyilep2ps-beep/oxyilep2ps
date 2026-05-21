'use client';

import { motion } from 'framer-motion';

const items = [
  {
    title: 'Bank-Level 256-bit SSL',
    desc: 'End-to-end encryption for all data in transit and at rest.',
  },
  {
    title: 'Segregated Tier-1 Accounts',
    desc: 'Client funds held separately in regulated Tier-1 banking partners.',
  },
  {
    title: 'Automated Fraud Detection',
    desc: 'Real-time heuristics and ML models to identify suspicious activity.',
  },
  {
    title: 'Smart Contract Security',
    desc: 'Audited contract logic with formal verification for payment flows.',
  },
  {
    title: 'Continuous Monitoring',
    desc: '24/7 SOC monitoring, incident response, and breach simulations.',
  },
  {
    title: 'UK GDPR & Data Vault',
    desc: 'Full GDPR compliance with encrypted data vaults and access controls.',
  },
];

export function TrustSecurity() {
  return (
    <section id="security" className="py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <h2 className="section-heading">Absolute Trust & Security</h2>
          <p className="section-subtitle mx-auto mt-4">Bank-level protections and rigorous operational controls to keep capital and data secure.</p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it, i) => (
            <motion.div
              key={it.title}
              whileHover={{ y: -6 }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card rounded-2xl p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-tr from-[#FF5A1F] to-[#FF814A] text-white font-semibold">✓</div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">{it.title}</h3>
                  <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-300">{it.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TrustSecurity;
