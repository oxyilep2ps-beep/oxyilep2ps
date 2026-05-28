import { SupabaseAdminDashboard } from '@/components/admin/supabase-admin-dashboard';

export const metadata = {
  title: 'Applications — Oxyile Admin',
  description: 'Review pending, approved, and rejected user applications',
};

export default function AdminApplicationsPage() {
  return <SupabaseAdminDashboard />;
}
