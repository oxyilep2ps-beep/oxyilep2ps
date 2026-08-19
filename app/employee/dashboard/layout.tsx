import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth/routing';
import { UniversalDashboardLayout } from '@/components/shared/universal-dashboard-layout';

export default async function EmployeeDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/employee/login?redirect=/employee/dashboard');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();

  if (!isAdminEmail(user.email) && profile?.role !== 'EMPLOYEE' && profile?.role !== 'ADMIN') {
    redirect('/employee/login?redirect=/employee/dashboard');
  }

  // Soft directory check for employees
  if (!isAdminEmail(user.email) && profile?.role === 'EMPLOYEE' && user.email) {
    const { data: dir } = await supabase
      .from('allowed_employees')
      .select('email')
      .eq('email', user.email.toLowerCase())
      .maybeSingle();
    if (!dir) redirect('/employee/login?revoked=1');
  }

  return <UniversalDashboardLayout portal="employee" isAdmin={profile?.role === 'ADMIN'}>{children}</UniversalDashboardLayout>;
}
