import Link from 'next/link';
import { Footer } from '@/components/footer';
import { HowItWorks } from '@/components/how-it-works';
import { TransparencyHub } from '@/components/transparency-hub';
import { FeaturesGrid } from '@/components/features-grid';
import { OxyileVsTraditional } from '@/components/oxyile-vs-traditional';
import { TrustSecurity } from '@/components/trust-security';
import { Regulatory } from '@/components/regulatory';
import { TeamSection } from '@/components/team-section';
import { FaqsAccordion } from '@/components/faqs-accordion';

export default function AboutPage() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-500">About Oxyile</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-black text-slate-950 dark:text-white sm:text-5xl">
          Transparent P2P lending built for trust, compliance, and real outcomes
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
          Oxyile connects verified UK borrowers and investors through a glass-clear handshake flow — from KYC to
          GoCardless mandates and on-chain contract verification.
        </p>
        <Link
          href="/signup"
          className="mt-6 inline-flex rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-glow"
        >
          Get started
        </Link>
      </section>

      <HowItWorks />
      <TransparencyHub />
      <FeaturesGrid />
      <OxyileVsTraditional />
      <TrustSecurity />
      <Regulatory />
      <TeamSection />
      <FaqsAccordion />
      <Footer />
    </>
  );
}
