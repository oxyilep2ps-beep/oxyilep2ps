import { HrStudioShell } from '@/components/hr/hr-studio-shell';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth/routing';
import { isHrStaffEmail } from '@/lib/auth/role-emails';
import { redirect } from 'next/navigation';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin?redirect=/portal/leave');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();

  if (!isAdminEmail(user.email) && !isHrStaffEmail(user.email) && profile?.role !== 'HR' && profile?.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return <HrStudioShell subtitle="Quick-create stubs — leave, expenses, and new employees.">{children}</HrStudioShell>;
}
