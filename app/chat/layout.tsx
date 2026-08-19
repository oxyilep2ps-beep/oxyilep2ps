import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth/routing';
import { AdminLayoutV2 } from '@/components/admin/admin-layout-v2';
import { UniversalDashboardLayout } from '@/components/shared/universal-dashboard-layout';

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin?redirect=/chat');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role ?? '';
  const isAdmin = isAdminEmail(user.email) || role === 'ADMIN';

  if (isAdmin) return <AdminLayoutV2>{children}</AdminLayoutV2>;
  if (role === 'HR') return <UniversalDashboardLayout portal="hr">{children}</UniversalDashboardLayout>;
  if (role === 'BLOGGER') return <UniversalDashboardLayout portal="blogger">{children}</UniversalDashboardLayout>;
  if (role === 'SOCIAL_MANAGER') return <UniversalDashboardLayout portal="social">{children}</UniversalDashboardLayout>;

  return <div className="min-h-screen bg-[#0a0a0a] text-white">{children}</div>;
}
