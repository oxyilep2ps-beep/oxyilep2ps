export function FeedPostCardSkeleton() {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-[#111] p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-neutral-800" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-32 animate-pulse rounded bg-neutral-800" />
          <div className="h-2.5 w-20 animate-pulse rounded bg-neutral-800/80" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-neutral-800" />
        <div className="h-3 w-[88%] animate-pulse rounded bg-neutral-800" />
        <div className="h-3 w-[62%] animate-pulse rounded bg-neutral-800" />
      </div>
      <div className="mt-4 flex items-center gap-4 border-t border-neutral-800/80 pt-3">
        <div className="h-4 w-14 animate-pulse rounded bg-[#F97316]/20" />
        <div className="h-4 w-14 animate-pulse rounded bg-neutral-800" />
      </div>
    </div>
  );
}

export function FeedPostListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <FeedPostCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function SuggestedUsersSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-neutral-800" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-28 animate-pulse rounded bg-neutral-800" />
            <div className="h-2.5 w-16 animate-pulse rounded bg-neutral-800/80" />
          </div>
          <div className="h-7 w-16 animate-pulse rounded-full bg-[#F97316]/15" />
        </div>
      ))}
    </div>
  );
}

export function GlobalFeedPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl pb-4 text-white">
      <div className="mb-6 space-y-2">
        <div className="h-7 w-48 animate-pulse rounded bg-neutral-800" />
        <div className="h-3 w-64 animate-pulse rounded bg-neutral-800/80" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <FeedPostListSkeleton count={4} />
        </div>
        <aside className="rounded-2xl border border-neutral-800 bg-[#111] p-4">
          <div className="mb-3 h-3 w-24 animate-pulse rounded bg-neutral-800" />
          <SuggestedUsersSkeleton />
        </aside>
      </div>
    </div>
  );
}
