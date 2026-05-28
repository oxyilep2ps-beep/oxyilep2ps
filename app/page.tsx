import { Hero } from '@/components/hero';
import { HowItWorks } from '@/components/how-it-works';
import { SavingsVsBank } from '@/components/savings-vs-bank';
import { TransparencyHub } from '@/components/transparency-hub';
import { LiveVerifiedProfiles } from '@/components/live-verified-profiles';
import { FeaturesGrid } from '@/components/features-grid';
import { OxyileVsTraditional } from '@/components/oxyile-vs-traditional';
import { TrustSecurity } from '@/components/trust-security';
import { Regulatory } from '@/components/regulatory';
import { SmartCalculator } from '@/components/smart-calculator';
import { ReviewsReputation } from '@/components/reviews-reputation';
import { FaqsAccordion } from '@/components/faqs-accordion';
import { TeamSection } from '@/components/team-section';
import { OliverBotFooter } from '@/components/oliver-bot-footer';
import { WaitlistModal } from '@/components/WaitlistModal';

export default function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <SavingsVsBank />
      <TransparencyHub />
      <LiveVerifiedProfiles />
      <FeaturesGrid />
      <OxyileVsTraditional />
      <TrustSecurity />
      <Regulatory />
      <SmartCalculator />
      <ReviewsReputation />
      <TeamSection />
      <FaqsAccordion />
      <OliverBotFooter />
      <WaitlistModal />
    </>
  );
}
