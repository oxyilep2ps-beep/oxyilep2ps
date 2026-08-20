import { redirect } from 'next/navigation';

/** Legacy public profile route — redirect to /profile/[username]. */
export default async function LegacyUserProfileRedirect({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  redirect(`/profile/${encodeURIComponent(username)}`);
}
