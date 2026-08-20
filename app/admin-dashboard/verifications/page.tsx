import { AdminVerificationsPanel } from '@/components/admin/admin-verifications-panel';

export const metadata = {
  title: 'Verifications — Oxyile Admin',
  description: 'Review pending financial role upgrade requests',
};

export default function AdminVerificationsPage() {
  return <AdminVerificationsPanel />;
}
