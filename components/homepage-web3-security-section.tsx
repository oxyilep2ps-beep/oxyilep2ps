'use client';

import { motion } from 'framer-motion';
import { Blocks, Hash, Link2, Shield } from 'lucide-react';

export function HomepageWeb3SecuritySection() {
  return (
    <section className="relative overflow-x-hidden overflow-y-hidden py-24">
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 via-[#0f1118] to-neutral-950" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,90,31,0.18),transparent_45%)]" />
      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-4 sm:px-6 md:px-8 lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55 }}
          className="relative min-w-0 w-full max-w-full"
        >
          <div className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-brand-500/30 to-purple-500/10 blur-3xl" />
          <div className="relative w-full max-w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/60 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
            <div className="flex min-w-0 items-center gap-2 overflow-hidden border-b border-white/10 pb-4">
              <span className="h-3 w-3 shrink-0 rounded-full bg-red-500/80" />
              <span className="h-3 w-3 shrink-0 rounded-full bg-amber-400/80" />
              <span className="h-3 w-3 shrink-0 rounded-full bg-emerald-400/80" />
              <span className="ml-2 truncate font-mono text-xs text-neutral-400">OxyileHandshake.sol</span>
            </div>
            <pre className="mt-4 max-w-full overflow-x-auto whitespace-pre font-mono text-xs leading-6 text-emerald-300/90">
{`contract OxyileHandshake {
  struct LoanAgreement {
    bytes32 deedHash;
    uint256 principal;
    uint8   repaymentStatus;
    address collateralRef;
  }

  mapping(bytes32 => LoanAgreement) public ledger;

  function mintAgreement(
    bytes32 handshakeId,
    uint256 amount,
    bytes32 deedOfCharge
  ) external onlyEscrow {
    ledger[handshakeId] = LoanAgreement({
      deedHash: deedOfCharge,
      principal: amount,
      repaymentStatus: 1,
      collateralRef: msg.sender
    });
    emit AgreementSecured(handshakeId);
  }
}`}
            </pre>
            <div className="mt-4 flex w-full max-w-full flex-wrap gap-2">
              {[
                { icon: Hash, label: '# Immutable hash' },
                { icon: Link2, label: 'Polygon Amoy' },
                { icon: Shield, label: 'Deed of Charge' },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex max-w-full items-center gap-1.5 break-words rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-300"
                >
                  <Icon size={12} className="shrink-0 text-brand-400" />
                  <span className="whitespace-normal">{label}</span>
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="min-w-0 w-full max-w-full break-words text-left"
        >
          <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-300">
            <Blocks size={14} className="shrink-0" />
            <span className="whitespace-normal">Immutable Web3 Security</span>
          </div>
          <h2 className="mt-6 break-words text-3xl font-black text-white sm:text-4xl">
            Secured by Polygon Layer-2
          </h2>
          <p className="mt-5 break-words text-sm leading-8 text-neutral-300">
            Every loan agreement, repayment status update, and Deed of Charge is hashed and stored immutably on the
            blockchain — verifiable on a public explorer, yet fully abstracted behind a frictionless Web2 experience
            for borrowers and investors.
          </p>
          <ul className="mt-8 space-y-4 text-sm text-neutral-300">
            {[
              'On-chain audit trail for regulators and institutional partners',
              'Polygonscan-verified contract proofs without exposing private keys',
              'Web3 resilience queue retries mints when the network is unavailable',
            ].map((item) => (
              <li key={item} className="flex min-w-0 gap-3 break-words">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                <span className="min-w-0 flex-1 whitespace-normal">{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
