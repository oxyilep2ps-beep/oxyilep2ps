import { UniversalDashboardLayout } from '@/components/shared/universal-dashboard-layout';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth/routing';
import { isBloggerStaffEmail } from '@/lib/auth/role-emails';
import { redirect } from 'next/navigation';

export default async function BloggerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin?redirect=/blogger');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin =
    isAdminEmail(user.email) || profile?.role === 'ADMIN';

  if (
    !isAdmin &&
    !isBloggerStaffEmail(user.email) &&
    profile?.role !== 'BLOGGER'
  ) {
    redirect('/dashboard');
  }

  return (
    <UniversalDashboardLayout portal="blogger" isAdmin={isAdmin}>
      {children}
    </UniversalDashboardLayout>
  );
}
