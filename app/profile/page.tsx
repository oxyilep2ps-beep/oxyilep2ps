import { SharedProfileEditView } from '@/components/profile/shared-profile-edit-view';

export const metadata = { title: 'Profile | Oxyile' };

export default function ProfilePage() {
  return <SharedProfileEditView backHref="/chat" backLabel="Back to Chat" />;
}
