'use client';

export function HrSkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="flex w-full flex-col gap-4" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex h-[88px] w-full animate-pulse items-center justify-between rounded-2xl border border-white/5 bg-neutral-800/30 p-4"
        >
          <div className="flex w-2/3 flex-col gap-3">
            <div className="h-5 w-3/4 rounded-md bg-neutral-700/40" />
            <div className="h-3 w-1/3 rounded-md bg-neutral-700/30" />
          </div>
          <div className="h-9 w-28 rounded-full bg-orange-500/10" />
        </div>
      ))}
    </div>
  );
}
