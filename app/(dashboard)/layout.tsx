import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerProfile } from '@/lib/auth/get-server-profile';
import { isApprovedStatus } from '@/lib/auth/profile-status';
import { getAuthRedirectPath, isAdminEmail } from '@/lib/auth/routing';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default async function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin');
  }

  const profile = await getServerProfile(supabase, user.id);

  if (!profile) {
    redirect('/signup');
  }

  const headerStore = await headers();
  const pathname = headerStore.get('x-pathname') ?? '';
  const isPendingRoute = pathname === '/pending-verification' || pathname.startsWith('/pending-verification/');
  const isDashboardRoute =
    pathname.startsWith('/dashboard') || pathname.startsWith('/chats') || pathname.startsWith('/user/');

  const email = user.email ?? profile.email ?? '';

  if (isAdminEmail(email) || profile.role === 'ADMIN') {
    if (!pathname.startsWith('/admin-dashboard')) {
      redirect('/admin-dashboard');
    }
    return <>{children}</>;
  }

  if (isApprovedStatus(profile.status)) {
    if (isPendingRoute) {
      redirect(getAuthRedirectPath(profile, email));
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
