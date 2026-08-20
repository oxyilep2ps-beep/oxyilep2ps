import { PremiumChatShellSkeleton } from '@/components/chat/chat-skeletons';

export default function ChatLoading() {
  return (
    <section className="oxyile-fill-chrome mx-auto -mb-[var(--oxyile-safe-bottom-padding)] flex w-full max-w-[1500px] flex-col gap-3 px-3 pt-2 sm:px-4">
      <div className="min-h-0 flex-1">
        <PremiumChatShellSkeleton />
      </div>
    </section>
  );
}
