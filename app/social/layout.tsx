import { UniversalDashboardLayout } from '@/components/shared/universal-dashboard-layout';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth/routing';
import { redirect } from 'next/navigation';

export default async function SocialLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin?redirect=/social');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin =
    isAdminEmail(user.email) || profile?.role === 'ADMIN';

  if (
    !isAdmin &&
    profile?.role !== 'SOCIAL_MANAGER'
  ) {
    redirect('/signin?redirect=/social');
  }

  return (
    <UniversalDashboardLayout portal="social" isAdmin={isAdmin}>
      {children}
    </UniversalDashboardLayout>
  );
}
