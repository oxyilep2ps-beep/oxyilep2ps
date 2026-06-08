import { Hero } from '@/components/hero';
import { HomepageTrustSection } from '@/components/homepage-trust-section';
import { SavingsVsBank } from '@/components/savings-vs-bank';
import { LiveVerifiedProfiles } from '@/components/live-verified-profiles';
import { SmartCalculator } from '@/components/smart-calculator';
import { ReviewsReputation } from '@/components/reviews-reputation';
import { OliverBotFooter } from '@/components/oliver-bot-footer';
import { WaitlistModal } from '@/components/WaitlistModal';

export default function Home() {
  return (
    <>
      <Hero />
      <HomepageTrustSection />
      <SavingsVsBank />
      <LiveVerifiedProfiles />
      <SmartCalculator />
      <ReviewsReputation />
      <OliverBotFooter />
      <WaitlistModal />
    </>
  );
}
