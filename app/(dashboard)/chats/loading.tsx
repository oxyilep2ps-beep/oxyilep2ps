import { PremiumChatShellSkeleton } from '@/components/chat/chat-skeletons';

export default function ChatsLoading() {
  return (
    <section className="mx-auto w-full max-w-lg px-3 pt-2">
      <PremiumChatShellSkeleton />
    </section>
  );
}
