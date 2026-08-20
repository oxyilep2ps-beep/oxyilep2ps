import { GlobalFeedPageSkeleton } from '@/components/feed/feed-skeletons';

export default function FeedLoading() {
  return (
    <section className="mx-auto w-full max-w-[1500px] px-3 pt-2 sm:px-4">
      <GlobalFeedPageSkeleton />
    </section>
  );
}
