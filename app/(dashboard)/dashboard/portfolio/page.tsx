import { Suspense } from 'react';
import { PortfolioContent } from '@/components/dashboard/portfolio-content';

export default function PortfolioPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-5xl px-4 py-8 text-center text-sm text-neutral-500">Loading portfolio…</section>
      }
    >
      <PortfolioContent />
    </Suspense>
  );
}
