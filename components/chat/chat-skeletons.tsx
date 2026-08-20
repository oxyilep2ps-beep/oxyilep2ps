export function ChatListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-gray-300 dark:bg-gray-700" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="h-3 w-28 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800/80" />
          <div className="h-2.5 w-10 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800/80" />
        </div>
        <div className="h-2.5 w-[70%] animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800/80" />
      </div>
    </div>
  );
}

export function ChatInboxListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-800/60" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <ChatListItemSkeleton key={i} />
      ))}
    </div>
  );
}

export function ChatMessageSkeleton({ align = 'left' }: { align?: 'left' | 'right' }) {
  return (
    <div className={`flex ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`h-10 max-w-[70%] animate-pulse rounded-2xl ${
          align === 'right'
            ? 'w-40 bg-[#F97316]/25'
            : 'w-52 bg-gray-200 dark:bg-gray-800/80'
        }`}
      />
    </div>
  );
}

export function ChatThreadSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-3 p-4" aria-hidden>
      <ChatMessageSkeleton align="left" />
      <ChatMessageSkeleton align="right" />
      <ChatMessageSkeleton align="left" />
      <ChatMessageSkeleton align="right" />
      <ChatMessageSkeleton align="left" />
    </div>
  );
}

export function PremiumChatShellSkeleton() {
  return (
    <div className="grid h-full min-h-[420px] overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-[#0a0a0a] md:grid-cols-12">
      <aside className="border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/60 md:col-span-4 md:border-r">
        <div className="border-b border-gray-200 p-3 dark:border-gray-800">
          <div className="mb-2 h-4 w-16 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800/80" />
          <div className="h-9 w-full animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800/80" />
        </div>
        <ChatInboxListSkeleton count={7} />
      </aside>
      <section className="hidden bg-white dark:bg-[#0a0a0a] md:col-span-8 md:flex md:flex-col">
        <div className="flex h-14 items-center gap-3 border-b border-gray-200 px-4 dark:border-gray-800">
          <div className="h-9 w-9 animate-pulse rounded-full bg-gray-300 dark:bg-gray-700" />
          <div className="h-3 w-32 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800/80" />
        </div>
        <ChatThreadSkeleton />
      </section>
    </div>
  );
}
