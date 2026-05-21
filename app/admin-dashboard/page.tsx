import { SupabaseAdminDashboard } from '@/components/admin/supabase-admin-dashboard';

export const metadata = {
  title: 'Admin Dashboard — Oxyile',
  description: 'KYC review and user approval for Oxyile administrators',
};

export default function AdminDashboardPage() {
  return <SupabaseAdminDashboard />;
}
