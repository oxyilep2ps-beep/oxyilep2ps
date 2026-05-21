'use client';

import Image from 'next/image';
import { useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { User } from 'lucide-react';

const TEAM = [
  {
    name: 'Preet Singh Datta',
    role: 'CEO',
    image: '/images/preet.jpeg',
    vision:
      'Preet founded Oxyile with a clear conviction: UK savers and borrowers deserve a marketplace built on transparency, not opacity. He leads strategy, regulatory engagement, and partnerships—shaping a platform where every loan is traceable, every risk is disclosed, and trust is earned through action, not marketing.',
  },
  {
    name: 'Jay Bonde',
    role: 'Director',
    image: '/images/jay.jpeg',
    vision:
      'Jay steers operations, governance, and growth across London and Cardiff—ensuring Oxyile scales responsibly within FCA expectations. His focus is sustainable unit economics, rigorous onboarding, and a culture where compliance and customer outcomes sit at the same table.',
  },
  {
    name: 'Priyanshu',
    role: 'Developer',
    image: '/images/priyanshu.jpeg',
    vision:
      'Priyanshu architects the technology that powers Oxyile end to end—from secure KYC flows and admin tooling to Polygon smart-contract hooks and GoCardless fiat rails. He builds for reliability, auditability, and a premium experience that feels as polished as a Tier-1 fintech.',
  },
] as const;

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const cardVariant: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

function TeamAvatar({ src, name, priority }: { src: string; name: string; priority?: boolean }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="relative mx-auto h-40 w-40 overflow-hidden rounded-full border-2 border-brand-500/40 bg-neutral-100 shadow-glow ring-4 ring-brand-500/10 dark:bg-neutral-900"
    >
      {status !== 'error' && (
        <Image
          src={src}
          alt={`${name} — Oxyile leadership`}
          fill
          priority={priority}
          className={`object-cover object-center transition-opacity duration-500 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
          sizes="(max-width: 768px) 160px, 160px"
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
        />
      )}
      {(status === 'loading' || status === 'error') && (
        <motion.div
          initial={{ opacity: 0.6 }}
          animate={{ opacity: status === 'loading' ? [0.5, 1, 0.5] : 1 }}
          transition={status === 'loading' ? { repeat: Infinity, duration: 1.4 } : undefined}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand-500/10 to-brand-600/5 text-brand-600 dark:text-brand-300"
        >
          <User size={40} className={status === 'loading' ? 'animate-pulse' : ''} />
          {status === 'error' && (
            <span className="px-2 text-center text-[10px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Photo unavailable
            </span>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

export function TeamSection() {
  return (
    <section id="team" className="py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-brand-500">Leadership</p>
          <h2 className="section-heading mt-3">Meet the Minds Behind Oxyile</h2>
          <p className="section-subtitle mx-auto">
            A founding team united by one vision: to rebuild peer-to-peer lending in the UK with institutional-grade
            compliance, human-centred design, and technology that connects verified capital to real opportunity—fairly,
            transparently, and at scale.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="mt-14 grid gap-8 md:grid-cols-3"
        >
          {TEAM.map((member, index) => (
            <motion.article
              key={member.name}
              variants={cardVariant}
              whileHover={{ y: -8, scale: 1.02 }}
              className="glass-card group flex flex-col rounded-[2rem] p-8 text-center transition-shadow hover:shadow-glow"
            >
              <TeamAvatar src={member.image} name={member.name} priority={index === 0} />
              <h3 className="mt-6 text-xl font-bold text-neutral-950 dark:text-white">{member.name}</h3>
              <p className="mt-2 inline-block rounded-full bg-brand-500/10 px-4 py-1 text-sm font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                {member.role}
              </p>
              <p className="mt-5 flex-1 text-sm leading-7 text-neutral-600 dark:text-neutral-300">{member.vision}</p>
              <div className="mx-auto mt-6 h-px w-12 bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />
            </motion.article>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}

export default TeamSection;
