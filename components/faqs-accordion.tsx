'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
  { q: 'What happens if a borrower defaults?', a: 'Default procedures include automatic collection attempts, collateral enforcement where applicable, and fair recovery processes in line with UK regulation.' },
  { q: 'How does a smart contract protect my funds?', a: 'Smart contracts automate releases based on verified events and hold funds in escrow until conditions are met.' },
  { q: 'Can I exit a loan early?', a: 'Yes — the secondary market allows selling loan slices; early exit costs are visible upfront.' },
  { q: 'What fees does Oxyile charge?', a: 'Fees are fully transparent and shown during negotiation. There are no hidden spreads taken from investor returns.' },
  { q: 'How is my data protected?', a: 'We comply with UK GDPR, encrypt data at rest and in transit, and use strict access controls.' },
  { q: 'Are investments covered by FSCS?', a: 'No — P2P lending is not covered by the FSCS. See the risk warning for guidance on portfolio allocation.' },
  { q: 'What documentation will I receive for tax?', a: 'We provide detailed statements and SEIS eligibility guidance where applicable for investors.' },
  { q: 'How do interest rates get negotiated?', a: 'Rates are proposed by borrowers or investors and can be accepted, countered, or auto-matched by our algorithm.' },
  { q: 'What are minimum commitments?', a: 'Minimum commitments vary by pool; typical minimum investments start at £250.' },
  { q: 'How does KYC work?', a: 'Automated KYC runs via trusted providers with manual review where needed for higher-risk profiles.' },
];

export function FaqsAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faqs" className="py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <h2 className="section-heading">Frequently Asked Questions</h2>
          <p className="section-subtitle mx-auto mt-4">Answers to common questions about defaults, smart contracts, fees, SEIS, and more.</p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {faqs.map((f, i) => (
            <div key={f.q} className="rounded-2xl border border-white/6 bg-white p-4 dark:bg-black dark:border-white/6">
              <button className="flex w-full items-center justify-between" onClick={() => setOpenIndex(openIndex === i ? null : i)}>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">{f.q}</h3>
                <div className="text-neutral-500">{openIndex === i ? '−' : '+'}</div>
              </button>

              <AnimatePresence>
                {openIndex === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28 }} className="mt-3 overflow-hidden text-sm text-neutral-700 dark:text-neutral-300">
                    <p>{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FaqsAccordion;
