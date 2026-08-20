import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UniversalDashboardLayout } from '@/components/shared/universal-dashboard-layout';

async function wrapSocialPage(children: React.ReactNode, redirectPath: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/signin?redirect=${redirectPath}`);

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

  return <div className="min-h-screen bg-white text-gray-900 dark:bg-black dark:text-white">{children}</div>;
}

export async function SocialLayerLayout({
  children,
  redirectPath,
}: {
  children: React.ReactNode;
  redirectPath: string;
}) {
  return wrapSocialPage(children, redirectPath);
}
