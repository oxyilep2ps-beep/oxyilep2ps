import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UniversalDashboardLayout } from '@/components/shared/universal-dashboard-layout';

export default async function FeedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin?redirect=/feed');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role ?? '';
  if (role === 'ADMIN') return <UniversalDashboardLayout portal="admin" isAdmin>{children}</UniversalDashboardLayout>;
  if (role === 'HR') return <UniversalDashboardLayout portal="hr">{children}</UniversalDashboardLayout>;
  if (role === 'BLOGGER') return <UniversalDashboardLayout portal="blogger">{children}</UniversalDashboardLayout>;
  if (role === 'SOCIAL_MANAGER') return <UniversalDashboardLayout portal="social">{children}</UniversalDashboardLayout>;
  if (role === 'BORROWER') return <UniversalDashboardLayout portal="borrower">{children}</UniversalDashboardLayout>;
  if (role === 'INVESTOR') return <UniversalDashboardLayout portal="investor">{children}</UniversalDashboardLayout>;
  if (role === 'EMPLOYEE') return <UniversalDashboardLayout portal="employee">{children}</UniversalDashboardLayout>;

  return <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-black dark:text-white">{children}</div>;
}
