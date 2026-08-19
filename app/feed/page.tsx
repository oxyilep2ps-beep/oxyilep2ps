import { redirect } from 'next/navigation';
import { requireApprovedUser } from '@/lib/auth/require-approved';
import { SocialFeed } from '@/components/feed/social-feed';

export const metadata = { title: 'Global Feed | Oxyile' };

export default async function GlobalFeedPage() {
  const { profile } = await requireApprovedUser();

  // Keep staff dashboards untouched while offering a social landing route.
  // Users can always navigate back via the "Go to My Portal" action in the feed UI.
  if (!profile) {
    redirect('/signin');
  }

  return <SocialFeed />;
}
