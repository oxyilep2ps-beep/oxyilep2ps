import Image from 'next/image';

export function HomepageTrustSection() {
  return (
    <section className="relative py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-14">
        <div className="relative overflow-hidden rounded-2xl border border-white/20 shadow-2xl dark:border-white/10">
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-tr from-black/50 via-transparent to-brand-500/20" />
          <Image
            src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=2000&auto=format&fit=crop"
            alt="Real Estate and Digital Finance"
            width={2000}
            height={1333}
            className="h-auto w-full object-cover"
            unoptimized
          />
        </div>
        <div className="glass-card rounded-[2rem] p-8 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-500">Trust & transparency</p>
          <h2 className="mt-3 text-3xl font-black text-neutral-950 dark:text-white sm:text-4xl">
            Built for real-world lending
          </h2>
          <p className="mt-4 text-sm leading-7 text-neutral-600 dark:text-neutral-300">
            Oxyile pairs verified UK borrowers and investors with bank-grade security, audited smart contracts on
            Polygon, and fixed 10% platform returns — so every handshake is transparent, traceable, and fair.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-neutral-700 dark:text-neutral-300">
            <li className="flex gap-2">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
              256-bit AES encryption for data at rest and in transit
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
              FCA-aligned onboarding and risk disclosures
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
              GoCardless-powered secure fiat collections
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
