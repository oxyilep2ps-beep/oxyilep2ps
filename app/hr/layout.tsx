import { UniversalDashboardLayout } from '@/components/shared/universal-dashboard-layout';
import { HrJobEditorProvider } from '@/components/hr/hr-job-editor-provider';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth/routing';
import { isHrStaffEmail } from '@/lib/auth/role-emails';
import { redirect } from 'next/navigation';

export default async function HrLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin?redirect=/hr');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin =
    isAdminEmail(user.email) || profile?.role === 'ADMIN';

  if (
    !isAdmin &&
    !isHrStaffEmail(user.email) &&
    profile?.role !== 'HR'
  ) {
    redirect('/dashboard');
  }

  return (
    <UniversalDashboardLayout portal="hr" isAdmin={isAdmin}>
      <HrJobEditorProvider>{children}</HrJobEditorProvider>
    </UniversalDashboardLayout>
  );
}
