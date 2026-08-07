import { Suspense } from 'react';
import { SocialStudioPanel } from '@/components/social/social-studio-panel';

export default function SocialStudioPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-neutral-900/60" />}>
      <SocialStudioPanel />
    </Suspense>
  );
}
