import { SharedProfileEditView } from '@/components/profile/shared-profile-edit-view';

export const metadata = {
  title: 'Edit Profile — Oxyile Admin',
};

export default function AdminProfileEditPage() {
  return <SharedProfileEditView backHref="/admin-dashboard/profile" backLabel="Back to profile" />;
}
