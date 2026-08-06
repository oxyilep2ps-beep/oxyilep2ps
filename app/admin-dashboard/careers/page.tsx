import { AdminCareersTab } from '@/components/admin/admin-careers-tab';
import { AdminMarkNotificationsRead } from '@/components/admin/admin-mark-notifications-read';

export const metadata = {
  title: 'Careers — Oxyile Admin',
};

export default function AdminCareersPage() {
  return (
    <>
      <AdminMarkNotificationsRead entityType="resume_submission" />
      <AdminCareersTab />
    </>
  );
}
