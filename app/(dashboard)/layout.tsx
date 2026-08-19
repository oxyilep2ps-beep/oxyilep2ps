import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerProfile } from '@/lib/auth/get-server-profile';
import { isApprovedStatus } from '@/lib/auth/profile-status';
import { getAuthRedirectPath } from '@/lib/auth/routing';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { UniversalDashboardLayout } from '@/components/shared/universal-dashboard-layout';

export default async function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin');
  }

  const profile = await getServerProfile(supabase, user.id);

  // Missing profile must NEVER bounce confirmed users back to /signup.
  // Send them to pending-verification (or sign-in) so email confirm works.
  if (!profile) {
    redirect('/pending-verification?confirmed=1');
  }

  const headerStore = await headers();
  const pathname = headerStore.get('x-pathname') ?? '';
  const isPendingRoute = pathname === '/pending-verification' || pathname.startsWith('/pending-verification/');
  const isDashboardRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/chats') ||
    pathname.startsWith('/chat') ||
    pathname.startsWith('/feed') ||
    pathname.startsWith('/user/');

  const email = user.email ?? profile.email ?? '';

  if (isApprovedStatus(profile.status)) {
    if (isPendingRoute) {
      redirect(getAuthRedirectPath(profile, email));
    }

    // Preserve role-specific dashboards for core platform roles.
    const isRootDashboard = pathname === '/dashboard';
    if (isRootDashboard) {
      if (profile.role === 'BORROWER') redirect('/dashboard/borrower');
      if (profile.role === 'INVESTOR') redirect('/dashboard/investor');
      redirect('/feed');
    }

    if (profile.role === 'BORROWER') {
      return <UniversalDashboardLayout portal="borrower">{children}</UniversalDashboardLayout>;
    }
    if (profile.role === 'INVESTOR') {
      return <UniversalDashboardLayout portal="investor">{children}</UniversalDashboardLayout>;
    }

    return <DashboardShell>{children}</DashboardShell>;
  }

  if (isDashboardRoute && !isPendingRoute) {
    redirect('/pending-verification');
  }

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] bg-transparent">
      {children}
    </div>
  );
}
